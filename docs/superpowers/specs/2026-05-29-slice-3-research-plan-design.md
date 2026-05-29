# Slice 3 — Research → Draft Learning Plan

**Date:** 2026-05-29
**Status:** Approved design (pending written-spec review)

## Where this sits

Learning Pills full loop: create project → **research → draft plan (this slice)** → review & approve plan → generate pills → deliver to Slack → "Got it / Kinda" → adapt → spaced review.

**Built so far (on `main`):** the Next.js app, theme foundation, `projects` + `sources` tables, the create/list/view-project flow, and delete-project. The project detail page already shows a **disabled "Generate learning plan →"** button as the hinge into this slice.

Spec for Slice 2: `docs/superpowers/specs/2026-05-28-slice-2-create-project-design.md`. Design source of truth: `docs/design-handoff/` (README §3 Researching, §4 Plan review, §AI Integration).

## Goal of Slice 3

Turn the "Generate learning plan →" button into a working pipeline: read the project's pasted URLs, ask Claude (with live web search available) for an **easiest-first list of ~5–7 concepts** (title + one-line hook + estimated minutes) plus a project **emoji + blurb**, store them, flip the project to a `review` state, and display the generated plan read-only.

This slice **generates and displays** the plan. The interactive keep/drop toggles and "Approve & create pills" are **Slice 4**; the pill content (typed blocks) is **Slice 5**.

## Flow

From the project detail page, clicking **Generate learning plan →** runs a synchronous server action that:

1. sets `projects.status = 'researching'`;
2. fetches the text of each pasted URL (failures skipped);
3. calls Claude with the fetched material + the project goal, **web search enabled**, instructed to use the material first and search to fill gaps, returning an easiest-first plan;
4. on success: **replaces** any existing concepts for the project, inserts the new ones, stores `emoji`/`blurb`, sets `status = 'review'`, and redirects to the plan view;
5. on failure: sets `status` back to `draft` and surfaces a "couldn't build a plan — try again" message.

While the action runs, a client **"Researching…"** overlay shows (the handoff's animated step checklist — cosmetic). This is a single-user local app, so synchronous generation is acceptable; the tradeoff is the request takes as long as it takes (tens of seconds) with no real-time progress. A background-job + polling model is a possible later upgrade, explicitly out of scope here.

**Re-generation:** clicking Generate on a project that already has a plan **replaces** the existing concepts and rebuilds (wipe + regenerate). No confirmation in this slice.

## Data model (additive — existing tables untouched)

`projects` — add three columns:
- `status` text not null default `'draft'` — `draft` | `researching` | `review` | `learning` (the column deferred from Slice 2; `learning` is set in Slice 4).
- `emoji` text (nullable) — set during research.
- `blurb` text (nullable) — short tagline, set during research.

New `concepts` table:
```
concepts
  id         serial PK
  projectId  integer not null FK -> projects.id
  position   integer not null            -- easiest-first order, 0-based
  title      text not null               -- 3-6 words
  hook       text not null               -- one plain sentence
  minutes    integer not null            -- estimated read time
  createdAt  timestamp not null default now
```
Slice 4 will add a kept/dropped flag; Slice 5 will add the pill block content. Not now. Migration via `drizzle-kit push`.

## Components (small, independently testable)

- **`src/lib/extract-text.ts`** — `extractReadableText(html: string): string`. Pure: parses HTML with `cheerio`, removes `script`/`style`/`nav`/`noscript`, collapses whitespace, trims, truncates to a per-source char budget (constant, e.g. `MAX_SOURCE_CHARS = 6000`). Empty/garbage HTML → `""`, never throws.
- **`src/lib/fetch-source.ts`** — `fetchSourceText(url: string): Promise<string>`. Server-side `fetch` with a timeout; on non-OK/timeout/error returns `""` (skipped, not fatal); passes the body through `extractReadableText`. (Network side isolated here so `extract-text` stays pure/offline-testable.)
- **`src/lib/plan.ts`** — `parsePlan(raw: unknown): Plan` validator/normalizer. `Plan = { emoji: string; blurb: string; concepts: { title: string; hook: string; minutes: number }[] }`. Validates shape, coerces `minutes` to a positive int, trims the concept list to `MAX_CONCEPTS` (e.g. 7), rejects with a clear error when `concepts` is missing/empty or a concept lacks `title`/`hook`.
- **`src/db/plan.ts`** — data layer:
  - `savePlan(projectId, plan)` — deletes existing concepts for the project (replace semantics), inserts the new concepts in `position` order, updates `projects` (`status='review'`, `emoji`, `blurb`).
  - `setProjectStatus(projectId, status)` — used to mark `researching` / reset to `draft`.
  - `getPlan(projectId)` — returns the project's concepts easiest-first (used by the plan view).
- **`src/lib/generate-plan.ts`** — `generatePlan({ name, goal, sources }): Promise<Plan>`. Orchestrates the Anthropic SDK call: builds the prompt from goal + fetched source texts, enables the **web-search server tool** plus a structured **`save_plan`** client tool, runs the message, and returns `parsePlan(<save_plan input>)`. (Exact tool wiring per the `claude-api` skill at implementation time; model: reuse `claude-sonnet-4-6` as in `scripts/ingest.ts`.)
- **Server action** `src/app/projects/[id]/research-actions.ts` — `generatePlanAction(projectId)`: `setProjectStatus('researching')` → `fetchSourceText` per source → `generatePlan` → `savePlan` → `redirect`; on thrown error, `setProjectStatus('draft')` and rethrow a user-facing error for the client to display.
- **UI:**
  - Make the detail-page "Generate learning plan →" button active via a small client component (`GeneratePlanButton`) that calls the action and shows the **Researching…** overlay while pending; on error shows the retry message.
  - **Plan view:** when `status` is `review` (or `learning`), the detail page renders the **emoji + blurb** and the **easiest-first concept list** (number chip, title, hook, minutes) read-only, per handoff §4 styling — without the include toggles/approve (Slice 4).

## Verification

### Automated (`npm test`, TDD)
1. **`extractReadableText`** — strips `script`/`style`/`nav`; collapses whitespace; truncates to budget; empty/garbage → `""`.
2. **`parsePlan`** — valid shape normalizes; missing/empty `concepts` or a concept missing `title`/`hook` rejects; `minutes` coerced to positive int; over-long list trimmed to cap.
3. **`savePlan`** — integration against Neon: inserts concepts in order, flips `status='review'`, stores emoji/blurb; **replace** semantics (a second `savePlan` wipes the first set); `getPlan` returns easiest-first. Cleanup in `afterEach` (delete concepts + project), matching existing data-layer tests.

Not auto-tested (network + non-deterministic): live URL fetching and the Claude + web-search call — covered manually below, consistent with the project's UI/AI verification approach.

### Manual (`npm run dev`)
1. **Happy path** — project with reachable URLs + goal → Generate → Researching overlay → plan view with emoji/blurb + ~5–7 easiest-first concepts.
2. **Plausibility** — concepts reflect the actual URLs/goal (confirms fetched text reached Claude).
3. **Dead-link resilience** — one good + one bogus URL → still succeeds (bad URL skipped).
4. **Web-search fallback** — niche/recent topic, no/thin URLs → sensible plan still returned.
5. **Status transitions** — pre: normal; mid (on refresh): `researching`; after: `review`.
6. **Error path** — force failure (kill network / bad `ANTHROPIC_API_KEY`) → "couldn't build a plan — try again"; project returns to `draft` (not stuck on `researching`).
7. **Re-generate** — Generate on a `review` project → existing concepts replaced by a fresh set.
8. **Cost sanity** — one generation = one model call + only the web searches Claude chose; flag excessive searching.

A small **`scripts/show-project.ts`** helper (run via `npx tsx --env-file=.env.local`) prints a project's row + its sources + concepts, to make steps 2/5/7 easy to inspect.

## Dependencies & cost
- New dep: **`cheerio`** (HTML→text). (`@mozilla/readability`-style article extraction is a possible later quality upgrade — out of scope.)
- New Anthropic usage: the **web-search server tool** — adds per-search cost on top of the model call. Accepted by the user.

## Explicitly out of scope (later slices)
Keep/drop toggles and plan approval (Slice 4); `learning` status transition (Slice 4); pill generation / typed blocks (Slice 5); Slack delivery (Slice 6); background-job generation + real-time progress; article-quality extraction; editing concepts by hand.

## Deferred decisions
- Background generation + polling vs synchronous → synchronous now.
- Per-source/total token budgets → start with `MAX_SOURCE_CHARS` constant; tune later.
- Confirmation before destructive re-generation → none now (revisit if it bites).
