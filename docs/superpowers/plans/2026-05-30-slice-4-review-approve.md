# Slice 4 — Review & Approve the Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated plan interactive — keep/drop each concept and approve, recording the kept set and flipping the project to `learning` — plus fold in three Slice 3 follow-ups (stuck-`researching` recovery, safe write ordering, blurb-vs-goal styling).

**Architecture:** One additive `concepts.included` column. A data-layer `approvePlan(projectId, keptIds)` writes the `included` flags first and the status flip last (safe, non-transactional ordering). Three thin server actions (`approve`/`reopen`/`resetToDraft`) wrap the data layer and redirect. A client `PlanReview` component holds local toggle state and renders the review UI; the detail page branches on `status` (draft / researching / review / learning).

**Tech Stack:** Next.js (App Router) + TypeScript, Drizzle + Neon (`neon-http`), Vitest. Existing patterns: server actions with `"use server"` + `NEXT_REDIRECT` re-throw in client components (see `DeleteProjectButton.tsx`, `GeneratePlanButton.tsx`).

**Spec:** `docs/superpowers/specs/2026-05-30-slice-4-review-approve-design.md`
**Design source of truth:** `docs/design-handoff/` README §4 (Plan review).

---

## File Structure

**Modify:**
- `src/db/schema.ts` — add `included` boolean to the `concepts` table.
- `src/db/plan.ts` — add `approvePlan(projectId, keptIds)`.
- `src/db/plan.test.ts` — add `approvePlan` integration tests.
- `src/app/projects/[id]/page.tsx` — branch on status; render `PlanReview` / read-only kept list / "Start over"; distinguish blurb vs goal.
- `src/app/globals.css` — toggle, sticky footer, `.goal-note` styles.

**Create:**
- `src/app/projects/[id]/review-actions.ts` — `approvePlanAction`, `reopenPlanAction`, `resetToDraftAction`.
- `src/app/projects/[id]/PlanReview.tsx` — client review component.

**Preserve:** `GeneratePlanButton.tsx`, `DeleteProjectButton.tsx`, `research-actions.ts`, `getPlan`/`savePlan`/`setProjectStatus` (extended, not replaced).

---

## Task 1: Add `included` column to `concepts`

**Files:** Modify `src/db/schema.ts`.

- [ ] **Step 1: Add the column**

In `src/db/schema.ts`, the `concepts` table currently ends:
```ts
  minutes: integer("minutes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
Add an `included` field before `createdAt`:
```ts
  minutes: integer("minutes").notNull(),
  included: boolean("included").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add `boolean` to the drizzle import**

The top of `src/db/schema.ts` imports from `drizzle-orm/pg-core`. Add `boolean`:
```ts
import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
```

- [ ] **Step 3: Push to Neon**

Run:
```bash
npm run db:push
```
Expected: drizzle-kit adds the `included` column to `concepts` (existing rows default to `true`). Accept any prompt to apply. If it STOPS on an interactive prompt that would hang, capture the text and report BLOCKED.

- [ ] **Step 4: Verify the column exists**

Run:
```bash
npx tsx --env-file=.env.local -e "import { neon } from '@neondatabase/serverless'; const sql = neon(process.env.DATABASE_URL); const r = await sql\`SELECT column_name FROM information_schema.columns WHERE table_name='concepts'\`; console.log(r.map(x => x.column_name));"
```
Expected: the printed array includes `included` (alongside `id`, `project_id`, `position`, `title`, `hook`, `minutes`, `created_at`).

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts
git commit -m "Slice 4: add concepts.included column"
```

---

## Task 2: `approvePlan` data layer (TDD, integration)

**Files:** Modify `src/db/plan.test.ts` (add tests), then `src/db/plan.ts` (add function).

- [ ] **Step 1: Write the failing tests**

Open `src/db/plan.test.ts`. Update the import of the data layer to include `approvePlan`:
```ts
import { savePlan, getPlan, setProjectStatus, approvePlan } from "./plan";
```
Then append these tests at the end of the file (the file already has `createdIds`, `afterEach` cleanup, and a `newProject()` helper from Slice 3 — reuse them):
```ts
test("approvePlan keeps only the given ids and flips status to learning", async () => {
  const id = await newProject();
  await savePlan(id, {
    emoji: "🤖",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 2 },
      { title: "B", hook: "h", minutes: 2 },
      { title: "C", hook: "h", minutes: 2 },
    ],
  });
  const before = await getPlan(id);
  const keptIds = [before[0].id, before[2].id]; // keep A and C, drop B

  await approvePlan(id, keptIds);

  const after = await getPlan(id);
  const includedById = new Map(after.map((c) => [c.id, c.included]));
  expect(includedById.get(before[0].id)).toBe(true);
  expect(includedById.get(before[1].id)).toBe(false);
  expect(includedById.get(before[2].id)).toBe(true);

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  expect(project.status).toBe("learning");
});

test("approvePlan reflects the latest kept set when re-approved", async () => {
  const id = await newProject();
  await savePlan(id, {
    emoji: "a",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 1 },
      { title: "B", hook: "h", minutes: 1 },
    ],
  });
  const rows = await getPlan(id);
  await approvePlan(id, [rows[0].id]); // keep only A
  await approvePlan(id, [rows[1].id]); // change mind: keep only B

  const after = await getPlan(id);
  const includedById = new Map(after.map((c) => [c.id, c.included]));
  expect(includedById.get(rows[0].id)).toBe(false);
  expect(includedById.get(rows[1].id)).toBe(true);
});
```

- [ ] **Step 2: Run the tests; verify they FAIL**

Run:
```bash
npm test -- src/db/plan.test.ts
```
Expected: FAIL — `approvePlan` is not exported / not a function.

- [ ] **Step 3: Implement `approvePlan`**

In `src/db/plan.ts`, add `inArray` to the drizzle import (currently `import { asc, eq } from "drizzle-orm";`):
```ts
import { asc, eq, inArray } from "drizzle-orm";
```
Then add this function (after `savePlan`, before `getPlan`):
```ts
export async function approvePlan(projectId: number, keptIds: number[]): Promise<void> {
  // included flags first, status flip last (safe ordering — no transaction).
  await db
    .update(concepts)
    .set({ included: false })
    .where(eq(concepts.projectId, projectId));
  if (keptIds.length > 0) {
    await db
      .update(concepts)
      .set({ included: true })
      .where(inArray(concepts.id, keptIds));
  }
  await db
    .update(projects)
    .set({ status: "learning" })
    .where(eq(projects.id, projectId));
}
```

- [ ] **Step 4: Run the tests; verify they PASS**

Run:
```bash
npm test -- src/db/plan.test.ts
```
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add src/db/plan.ts src/db/plan.test.ts
git commit -m "Slice 4: approvePlan data layer + tests"
```

---

## Task 3: Review/approve server actions

**Files:** Create `src/app/projects/[id]/review-actions.ts`. (No unit test — thin redirect wrappers; covered by the data-layer tests + manual verification.)

- [ ] **Step 1: Create the actions file**

`src/app/projects/[id]/review-actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { approvePlan, setProjectStatus } from "@/db/plan";

export async function approvePlanAction(projectId: number, keptIds: number[]) {
  await approvePlan(projectId, keptIds);
  redirect(`/projects/${projectId}`);
}

export async function reopenPlanAction(projectId: number) {
  await setProjectStatus(projectId, "review");
  redirect(`/projects/${projectId}`);
}

export async function resetToDraftAction(projectId: number) {
  await setProjectStatus(projectId, "draft");
  redirect(`/projects/${projectId}`);
}
```

- [ ] **Step 2: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0. Do NOT run `npm run dev`.

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/\[id\]/review-actions.ts
git commit -m "Slice 4: review/approve/reopen/reset server actions"
```

---

## Task 4: `PlanReview` client component + styles

**Files:** Create `src/app/projects/[id]/PlanReview.tsx`; append to `src/app/globals.css`.

- [ ] **Step 1: Create the component**

`src/app/projects/[id]/PlanReview.tsx`:
```tsx
"use client";

import { useState } from "react";
import { approvePlanAction } from "./review-actions";

export interface ReviewConcept {
  id: number;
  position: number;
  title: string;
  hook: string;
  minutes: number;
  included: boolean;
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function PlanReview({
  projectId,
  concepts,
}: {
  projectId: number;
  concepts: ReviewConcept[];
}) {
  const [kept, setKept] = useState<Record<number, boolean>>(
    () => Object.fromEntries(concepts.map((c) => [c.id, c.included])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const keptConcepts = concepts.filter((c) => kept[c.id]);
  const keptCount = keptConcepts.length;
  const totalMinutes = keptConcepts.reduce((sum, c) => sum + c.minutes, 0);

  function toggle(id: number) {
    setKept((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function approve() {
    if (keptCount === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await approvePlanAction(
        projectId,
        concepts.filter((c) => kept[c.id]).map((c) => c.id),
      );
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setSubmitting(false);
      setError("Couldn't approve the plan — please try again.");
    }
  }

  return (
    <>
      <ol className="concept-list">
        {concepts.map((c) => (
          <li
            key={c.id}
            className={kept[c.id] ? "concept-row" : "concept-row concept-dropped"}
          >
            <span className="concept-num">{c.position + 1}</span>
            <div>
              <p className="concept-title">{c.title}</p>
              <p className="concept-hook">{c.hook}</p>
            </div>
            <span className="concept-minutes">{c.minutes}m</span>
            <button
              type="button"
              className={kept[c.id] ? "toggle toggle-on" : "toggle toggle-off"}
              role="switch"
              aria-checked={kept[c.id]}
              aria-label={`${kept[c.id] ? "Drop" : "Keep"} ${c.title}`}
              onClick={() => toggle(c.id)}
            >
              <span className="toggle-knob">{kept[c.id] ? "✓" : "✕"}</span>
            </button>
          </li>
        ))}
      </ol>

      {error && <p className="error">{error}</p>}

      <div className="review-footer">
        <span className="review-summary">
          {keptCount} concept{keptCount === 1 ? "" : "s"} · ~{totalMinutes} min
        </span>
        <button
          type="button"
          className="btn-gradient"
          onClick={approve}
          disabled={keptCount === 0 || submitting}
        >
          {submitting ? "Approving…" : "Approve plan ✓"}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Append styles to `src/app/globals.css`**

```css
/* plan review — toggles + sticky footer (Slice 4) */
.concept-dropped { opacity: 0.5; }

.toggle {
  flex: none;
  width: 46px;
  height: 27px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  transition: background 0.15s ease;
}
.toggle-on { background: var(--grad); justify-content: flex-end; }
.toggle-off { background: var(--track); justify-content: flex-start; }
.toggle-knob {
  width: 23px;
  height: 23px;
  margin: 0 2px;
  border-radius: 999px;
  background: #fff;
  color: var(--text-dim);
  font-size: 12px;
  display: grid;
  place-items: center;
}
.toggle-on .toggle-knob { color: var(--accent); }

.review-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-solid);
}
.review-summary { color: var(--text-dim); font-size: 13.5px; }

/* user goal, distinct from the AI blurb (Slice 4) */
.goal-note {
  margin: 0 0 28px;
  font-size: 13.5px;
  color: var(--text-dim);
}
.goal-note strong {
  color: var(--text);
  font-family: var(--font-fredoka), sans-serif;
}
```
(The `.concept-row` already uses `display: flex; align-items: center; gap: 14px;`, so the toggle sits inline after the minutes. `.concept-minutes` has `margin-left: auto`, which pushes both it and the toggle to the right edge as a group.)

- [ ] **Step 3: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/\[id\]/PlanReview.tsx src/app/globals.css
git commit -m "Slice 4: PlanReview component + toggle/footer/goal styles"
```

---

## Task 5: Wire the detail page (status branches + folded follow-ups)

**Files:** Modify `src/app/projects/[id]/page.tsx`.

- [ ] **Step 1: Replace `src/app/projects/[id]/page.tsx` with the status-aware version**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";
import { getPlan } from "@/db/plan";
import { GeneratePlanButton } from "./GeneratePlanButton";
import { DeleteProjectButton } from "../DeleteProjectButton";
import { PlanReview } from "./PlanReview";
import { reopenPlanAction, resetToDraftAction } from "./review-actions";

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
  const keptConcepts = concepts.filter((c) => c.included);

  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ All projects</Link>
      <h1 className="gradient-title">
        {project.emoji ? `${project.emoji} ` : ""}
        {project.name}
      </h1>
      {project.blurb && <p className="subtitle">{project.blurb}</p>}
      {project.goal && (
        <p className="goal-note">
          <strong>Your goal:</strong> {project.goal}
        </p>
      )}
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

      {project.status === "review" ? (
        <>
          <h3>Review your plan</h3>
          <p className="subtitle">Keep what you want to learn, drop the rest.</p>
          <PlanReview projectId={numericId} concepts={concepts} />
          <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
        </>
      ) : project.status === "learning" ? (
        <>
          <h3>Learning plan</h3>
          <ol className="concept-list">
            {keptConcepts.map((c) => (
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
          <p className="subtitle">✨ Pills coming soon — this is where your lessons will live.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <form action={reopenPlanAction.bind(null, numericId)}>
              <button type="submit" className="btn-ghost">Edit plan</button>
            </form>
            <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
          </div>
        </>
      ) : project.status === "researching" ? (
        <>
          <p className="subtitle">Researching… refresh in a moment.</p>
          <form action={resetToDraftAction.bind(null, numericId)}>
            <button type="submit" className="btn-ghost">Start over</button>
          </form>
        </>
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

Notes on what changed vs the current page:
- **Goal** now renders in a `.goal-note` block with a "Your goal:" label (was a second `.subtitle`, visually identical to the blurb).
- The single `hasPlan` block split into explicit `review` (interactive `PlanReview`) and `learning` (read-only **kept** concepts + "Pills coming soon" + Edit/Regenerate) branches.
- The `researching` branch gains a **"Start over"** button.
- `reopenPlanAction`/`resetToDraftAction` are bound to the id and invoked via a plain `<form action={...}>` (server action; no client component needed for a single button). `.btn-ghost` already exists in `globals.css` (used by the delete modal).

- [ ] **Step 2: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0; `/projects/[id]` compiles.

- [ ] **Step 3: Manual end-to-end verification**

Run `npm run dev`. Using a project that already has a generated plan (`review` status):
1. Toggle some concepts off → footer count and minutes update live; dropped rows dim.
2. "Approve plan ✓" → lands on `learning` showing only the kept concepts + "Pills coming soon".
3. "Edit plan" → re-opens to `review` with toggles reflecting the saved kept/dropped state; change and re-approve.
4. Toggle all off → "Approve plan ✓" is disabled.
5. The "Your goal" line is visually distinct from the AI blurb.
6. (If you can reach a `researching` project, or temporarily set one via `scripts/show-project.ts` inspection) "Start over" returns it to `draft`.
Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/\[id\]/page.tsx
git commit -m "Slice 4: status-branched detail page (review/learning/start-over) + goal styling"
```

---

## Done criteria

- A `review` project shows keep/drop toggles, a live count, and an "Approve plan ✓" button (disabled at 0 kept); approving records `included` and flips to `learning`.
- A `learning` project shows only kept concepts read-only, a "Pills coming soon" placeholder, and Edit/Regenerate.
- A `researching` project has a "Start over" recovery button → `draft`.
- The user's goal is visually distinct from the AI blurb.
- `approvePlan` writes flags first, status last (safe ordering).
- `npm test` green; `npm run build` clean.
- No pill generation, Hub UI, or Slack — later slices.
