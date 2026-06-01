# Slice 4b — Editable Materials + Goal-Aware Generation

**Date:** 2026-06-01
**Status:** Approved design (pending written-spec review)

## Where this sits

A refinement on top of Slice 4 (review & approve the plan), built on the open `slice-4-review-approve` branch / PR #4. It closes two gaps the user found while testing Slice 4:

1. **Add/remove reference URLs after project creation** — currently URLs can only be set at creation (`CreateProjectForm`); the detail page shows them read-only with no way to add more.
2. **Make the goal actually steer generated content** — the goal already reaches Claude (`research-actions.ts` passes `project.goal`; `generate-plan.ts` includes `Learner's goal: …`), but the prompt only *states* it, never instructs the model to tailor concept selection/framing to it.

Slice 4 spec: `docs/superpowers/specs/2026-05-30-slice-4-review-approve-design.md`. Design source: `docs/design-handoff/` README §7 (Add resources / re-adapt — this is a slimmed-down version).

## Goal of Slice 4b

Let the user edit a project's reference materials (add/remove URLs) from the detail page in any state, where **adding a URL auto-triggers re-research** (regenerates the plan using the new materials). Separately, strengthen the generation prompt so the user's goal explicitly shapes which concepts are chosen and how they're framed.

## Part A — Goal-aware generation

Change the prompt in `src/lib/generate-plan.ts` so the goal is a **directive**, not just stated context: when a goal is present, instruct the model to prioritize and frame the concepts to serve that goal (still easiest-first, still 5–`MAX_CONCEPTS`). No change to the function signature, the web-search flow, the JSON shape, or `parsePlan`. The goal is already threaded through `generatePlanAction → generatePlan({goal})`, so this is a prompt-wording change only.

Verification: manual (non-deterministic output) — a project whose goal emphasizes one angle produces concepts visibly slanted toward it.

## Part B — Editable materials + auto re-research

### Data layer (`src/db/projects.ts`)
- `addSource(projectId, url)` — trims; rejects via `isValidHttpUrl` (throws on invalid); dedupes against the project's existing URLs (no-op insert if already present); inserts a `sources` row. Returns the inserted row (or the existing one on dedupe).
- `removeSource(sourceId, projectId)` — deletes the `sources` row scoped by **both** `id` and `projectId` (project-scoped, mirroring the `approvePlan` scoping fix).

TDD + integration tests against Neon (insert + cleanup), following the existing `projects.test.ts` pattern.

### Refactor: extract the research pipeline
Extract the body of `generatePlanAction` (set `researching` → fetch each source's text → `generatePlan` → `savePlan`; on error reset to `draft` and rethrow) into a reusable async function **`researchProject(projectId)`** in `src/lib/research-project.ts` (server-only module — it imports `generatePlan`, `fetchSourceText`, the data layer). `generatePlanAction` becomes a thin wrapper: `await researchProject(projectId); redirect(...)`. Behavior is byte-for-byte identical; this just lets the add-source action reuse it (DRY). The redirect stays in the action (not in `researchProject`).

### Server actions (`src/app/projects/[id]/source-actions.ts`, `"use server"`)
- `addSourceAction(projectId, url)` — `await addSource(projectId, url)` → `await researchProject(projectId)` → `redirect(/projects/${projectId})`. This is the auto-regenerate: adding a URL rebuilds the plan with the new materials.
- `removeSourceAction(sourceId, projectId)` — `await removeSource(sourceId, projectId)` → `redirect(/projects/${projectId})`. **No** auto-regenerate (removing a URL shouldn't spend a research call; the next add or a manual "Regenerate plan ↻" picks up the change).

Both re-throw `NEXT_REDIRECT` per the established pattern when invoked from a client component.

### UI (`src/app/projects/[id]/ReferenceMaterials.tsx`, client component)
Replaces the read-only materials list on the detail page. Shown in **any** status. Renders:
- the existing URLs, each with a remove **✕** (calls `removeSourceAction`),
- an add-URL row: an input + an **"Add & re-research"** button that validates with `isValidHttpUrl` (inline error on invalid), then calls `addSourceAction`.
- While `addSourceAction` runs it shows the existing **"Researching…" overlay** (reuse the portal/markup from `GeneratePlanButton`, or lift it into a tiny shared piece) so the auto-regen has the same feedback as Generate/Regenerate. Errors surface inline.

The detail page passes the project id + its `sources` to `ReferenceMaterials` and drops the old inline `<ul>`.

## Consequences (intended)
- **Adding a URL wipes the current concepts and rebuilds → project returns to `review`** (re-approve needed) and **spends one Claude + web-search call per add.** This is the direct, accepted result of "auto-regenerate on add."
- Removing a URL is cheap (no regen) and leaves the current plan as-is until the next regenerate.

## Verification

### Automated (TDD, integration against Neon)
- `addSource` — inserts a valid URL; rejects an invalid one (throws); deduplicates a URL already on the project.
- `removeSource` — removes the given source and only that one; scoped by projectId (a source id from another project is not removed).
- Cleanup deletes concepts/sources/projects in `afterEach` (existing pattern).
- (`researchProject` itself is network + non-deterministic — not unit-tested; covered by the existing manual generate flow.)

### Manual (`npm run dev`)
1. Open a `learning` project → in Reference materials, add a new URL → "Researching…" overlay → lands back on `review` with a regenerated plan that reflects the added material.
2. Remove a URL → it disappears; the current plan is unchanged until a regenerate.
3. Add an invalid URL → inline validation error, no call made.
4. A goal that stresses a particular angle yields concepts visibly tailored to it (Part A).
5. Existing flows still work: Generate (draft→review), Approve (review→learning), Edit, Start over, Regenerate, Delete.

## Explicitly out of scope
File/PDF uploads (URLs only, per the project-wide decision); the handoff's full re-adapt modal with append-don't-replace semantics (we replace via full regenerate); pill generation / Hub (Slice 5); Slack (Slice 6); batching multiple adds into one regenerate (add is one-at-a-time auto-regen by decision).

## Deferred decisions
- Append-style adaptation (add one concept for the new material instead of full regenerate) → deferred; full regenerate for now.
- Save-only add (batch then manual regenerate) → considered and declined; auto-regenerate on add chosen.
