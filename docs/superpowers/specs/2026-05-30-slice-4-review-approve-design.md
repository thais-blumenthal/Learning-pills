# Slice 4 — Review & Approve the Plan

**Date:** 2026-05-30
**Status:** Approved design (pending written-spec review)

## Where this sits

Learning Pills loop: create project → research → draft plan → **review & approve (this slice)** → generate pills → deliver to Slack → feedback → spaced review.

**Built so far (on `main`):** the Next.js app + theme (Slice 2), create/list/view + delete projects, and research → draft plan (Slice 3 — the detail page generates a `review`-status plan and renders the concepts read-only). This slice makes that plan **interactive**: keep/drop concepts and approve, flipping the project to `learning`.

Design source of truth: `docs/design-handoff/` (README §4 Plan review). Slice 3 spec: `docs/superpowers/specs/2026-05-29-slice-3-research-plan-design.md`.

## Goal of Slice 4

Let the user review the generated plan — toggle each concept keep/drop, see a live count — and **approve** it, recording which concepts are kept and moving the project to `learning`. Plus three folded-in follow-ups from the Slice 3 review: stuck-`researching` recovery, safe (non-transactional) write ordering, and distinguishing the AI blurb from the user's goal on the detail page.

Pill generation and the Hub journey UI are **Slice 5**.

## Flow

The project detail page renders by `status`:
- **`draft`** → "Generate learning plan →" button (unchanged from Slice 3).
- **`researching`** → "Researching…" message **+ a "Start over" button** that resets the project to `draft` (recovery — see Folded follow-ups).
- **`review`** → the **interactive plan review**: each concept is a row with a keep/drop **toggle** (handoff §4: on = gradient with ✓, off = dimmed with ✕), a number chip, title + hook, and minutes. A footer shows a live summary (*"{n} concepts · ~{min} min"*) and an **"Approve plan ✓"** button, disabled when 0 concepts are kept. Approving records the kept set and flips the project to `learning`. The "Regenerate plan ↻" button remains available (wipes → new plan → `review`).
- **`learning`** → kept concepts shown **read-only**, a **"Pills coming soon"** placeholder (the Slice 5 hinge), an **"Edit plan"** button (re-opens to `review` to re-toggle, a cheap status flip — no regenerate), and "Regenerate plan ↻".

Excluded concepts are flagged `included = false`, **not deleted**, so they reappear (toggled off) when the user edits the plan.

## Data model (additive)

One column on the existing `concepts` table:
- `included` boolean not null default `true`.

Freshly generated plans (Slice 3 `savePlan`) insert concepts without setting `included`, so they default to `true` (all kept). Approving sets `included` per the user's toggles. Migration via `drizzle-kit push`.

## Components

- **`src/app/projects/[id]/PlanReview.tsx`** (client) — receives the project's concepts (each with `id`, `position`, `title`, `hook`, `minutes`, `included`). Holds local toggle state initialized from `included`. Renders the concept rows with toggles, a live footer (kept count + summed minutes of kept), and the "Approve plan ✓" button (disabled when kept count is 0). On approve, calls `approvePlanAction(projectId, keptIds)`.
- **Server actions** in `src/app/projects/[id]/review-actions.ts` (`"use server"`):
  - `approvePlanAction(projectId, keptIds: number[])` → `approvePlan(projectId, keptIds)` then `redirect` to the project.
  - `reopenPlanAction(projectId)` → `setProjectStatus(projectId, "review")` then `redirect`.
  - `resetToDraftAction(projectId)` → `setProjectStatus(projectId, "draft")` then `redirect`.
  Each re-throws the Next.js `NEXT_REDIRECT` error (the established client pattern) so navigation works.
- **Data layer** — add `approvePlan(projectId, keptIds)` to `src/db/plan.ts`:
  - sets `included = true` for the project's concepts whose id is in `keptIds`, `included = false` for the rest (the `included` writes happen **first**), then sets `projects.status = "learning"` **last** (safe ordering).
  - `setProjectStatus` (from Slice 3) is reused for reopen/reset — no new function needed.
  - `getPlan` (from Slice 3) already returns the full concept rows including the new `included` column.
- **Detail page** (`src/app/projects/[id]/page.tsx`) — branch on `status` as described in Flow; render `PlanReview` for `review`, the read-only kept list + Edit/Regenerate + placeholder for `learning`, and the "Start over" button in the `researching` branch. The "Generate/Regenerate" button (`GeneratePlanButton`) and delete button are preserved.

## Folded-in follow-ups

1. **Stuck-`researching` recovery:** the `researching` branch shows a **"Start over"** button → `resetToDraftAction` flips `status` to `draft`, so a project whose generation was interrupted is no longer locked out (it can be regenerated). `resetToDraft` only changes status; a later regenerate replaces any stale concepts.
2. **Safe write ordering (no transactions):** `approvePlan` writes the `included` flags first and the `status='learning'` flip last; a partial failure leaves the project in `review` to re-approve (no corruption). This matches `savePlan`'s existing status-last ordering. The data layer stays on `neon-http`; switching to a transaction-capable driver later remains a contained change in `src/db/index.ts`.
3. **Blurb vs goal styling:** on the detail page, the AI **blurb** remains the gradient subtitle; the user's **goal** renders with a small **"Your goal"** label (a `.goal-note` block) so the two are visually distinct.

## Verification

### Automated (TDD, integration against Neon)
Add to `src/db/plan.test.ts`:
- `approvePlan` sets `included` correctly — concepts in `keptIds` → `true`, others → `false` — and flips `status` to `learning`.
- A concept dropped then re-kept (two `approvePlan` calls with different `keptIds`) reflects the latest set.
- (reopen/reset reuse `setProjectStatus`, already tested; optionally assert the status values.)
Cleanup deletes concepts then projects in `afterEach` (existing pattern).

### Manual (`npm run dev`)
1. Open a `review` project → toggle some concepts off → footer count/minutes update live → "Approve plan ✓" → lands on `learning` showing only the kept concepts + "Pills coming soon".
2. "Edit plan" → re-opens to `review` with toggles reflecting the saved kept/dropped state → change and re-approve.
3. "Approve" is disabled when all concepts are toggled off.
4. From a `researching` project, "Start over" → returns to `draft` (Generate button reappears).
5. "Regenerate plan ↻" still wipes and rebuilds → back to `review`.
6. Blurb and goal are visually distinct on the detail page.

## Explicitly out of scope (later slices)
Pill content generation and the Focus reader / typed blocks (Slice 5); the Hub journey UI — Path/Cards/Grid (Slice 5); Slack delivery (Slice 6); "Got it / Kinda" feedback + adaptation (Slice 7); spaced repetition (Slice 8); concept reordering (the handoff's drag handle is decorative); database transactions (deferred, upgradeable).

## Deferred decisions
- Transaction-capable DB driver → deferred; safe ordering for now.
- Auto-detecting a stale `researching` state (e.g. via timestamps) → manual "Start over" for now.
