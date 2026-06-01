# Slice 5 — Pill Content Generation + Focus Reader

**Date:** 2026-06-01
**Status:** Approved design (pending written-spec review)

## Where this sits

Learning Pills loop: create → research → draft plan → review & approve → **generate pills + read them (this slice)** → deliver to Slack → "Got it/Kinda" adaptation → spaced review.

**Built so far (on `main`):** create/research/approve flow; a project at `learning` status has an approved, ordered set of kept concepts (`concepts.included = true`, each with title + hook + minutes), rendered read-only on the detail page with a "Pills coming soon" placeholder. This slice makes those concepts into readable, completable **pills**.

Design source of truth: `docs/design-handoff/` README §6 (Focus reader — the mixed-media lesson, **Layout A · Labeled blocks**) and `design_files/pill-layouts.jsx` (block components). Slice 4 spec: `docs/superpowers/specs/2026-05-30-slice-4-review-approve-design.md`.

## Decomposition note

The handoff's "learning experience" is several subsystems. This slice is the **vertical core**: generate pill content + a Focus reader to open and complete one pill. The **Hub journey UI** (Path/Cards/Grid, progress ring, streak — handoff §5) is deferred to **Slice 6**; until then, pills are opened from the existing `learning` concept list on the detail page. Slack delivery (Slice 6+), reinforcement-pill insertion and "Got it/Kinda" adaptation (Slice 7), and spaced repetition (Slice 8) remain later. Real images/video are out (no media source) — text blocks only.

## Goal of Slice 5

Turn each approved concept into a pill — an ordered sequence of typed text blocks plus a takeaway — generated **lazily** the first time the concept is opened, displayed in a full-screen **Focus reader** with an inline check that gates completion. Completing records `mastered` or `shaky`.

## The block model

A pill's body is an ordered array of typed blocks (stored as JSON on the concept). Supported kinds this slice (all Claude-generatable text):
- **`read`** — `{ kind: "read", text?: string, points?: string[] }` — a paragraph and/or a bulleted key-points list (at least one of `text`/`points` present).
- **`callout`** — `{ kind: "callout", text: string }` — the "PICTURE THIS ✦" analogy aside (rendered with READ styling tint per handoff).
- **`do`** — `{ kind: "do", question: string, options: string[], answer: number }` — an inline multiple-choice check; `options` length 3, `answer` is the 0–2 index of the correct option.

Pill-level: **`takeaway: string`** (the gradient left-border closing line).

Deferred kinds (not generated/rendered this slice): `look` (image / interactive diagram), `watch` (video).

**Invariant:** a pill has **exactly one `do` block** — it is the completion gate. The validator enforces this (if the model returns zero, generation fails and is retried/surfaced as an error; if more than one, only the first is kept).

## Data model (additive — `concepts` table)

Add four nullable columns:
- `blocks` text — JSON-encoded block array; `null` until generated.
- `takeaway` text — the pill's takeaway; set with `blocks`.
- `completion` text — `null` | `'mastered'` | `'shaky'`.
- `completedAt` timestamp — set when completion is recorded.

No new table: pills are small, one per concept, always loaded whole, and belong 1:1 to a concept — a JSON column is the right granularity. Migration via `drizzle-kit push`.

## Components

- **`src/lib/pill-blocks.ts`** (pure) — `Block` / `ReadBlock` / `CalloutBlock` / `DoBlock` types, `Pill = { blocks: Block[]; takeaway: string }`, and `parsePill(raw): Pill`. Validates/normalizes: each block has a known `kind`; `read` needs `text` or non-empty `points`; `callout` needs `text`; `do` needs `question`, exactly 3 string `options`, and an `answer` coerced into 0–2; the block list must contain **exactly one** `do` (throws if zero; keeps the first if several); `takeaway` is a non-empty string (defaulted if missing). Mirrors `parsePlan`.
- **`src/lib/generate-pill.ts`** — `generatePill({ projectName, goal, conceptTitle, conceptHook }): Promise<Pill>`. One Anthropic call (`claude-sonnet-4-6`, `max_tokens` ~1500, **no web-search tool** — it works from the concept title/hook + goal), prompted ADHD-first to produce 3–5 text blocks (a `read`, an optional `callout`, ending with one `do` check) + a takeaway, tailored to the goal when present. Returns `parsePill(<parsed JSON>)`. Defensive JSON slice like `generate-plan.ts`. No unit test (network/non-deterministic) — manual verification.
- **`src/db/pills.ts`** (data layer):
  - `getOrCreatePill(conceptId)` — loads the concept (+ its project name/goal + sibling kept concepts for "n of m"); if `blocks` is null, calls `generatePill`, saves `blocks`/`takeaway`, returns the freshly-saved pill; else returns the cached pill. Generation cost is paid once per concept, on first open.
  - `completePill(conceptId, completion: 'mastered' | 'shaky')` — sets `completion` + `completedAt`.
  - `getConceptForReader(conceptId)` — returns the concept with its project id, the parsed pill (if any), its 1-based index among the project's kept concepts, and the kept-concept count (for "CONCEPT n OF m" + the back link). Used by the reader page after generation.
  - The save/complete writes are project-status-agnostic; `getOrCreatePill` is only called from the reader route.
- **`src/app/projects/[id]/pills/[conceptId]/page.tsx`** — server component: validates ids, calls `getOrCreatePill` (first open generates — covered by the overlay below), then renders `FocusReader` with the pill + position info. `notFound()` for a bad/foreign concept id.
- **`src/app/projects/[id]/pills/[conceptId]/FocusReader.tsx`** (client) — Layout A reader: top bar (‹ back to project, gradient progress fill, "◷ {min} min"), "CONCEPT {n} OF {m}" kicker → gradient title → the block sequence with color-coded **kind-tags** (`read` 📖 / `callout` ✦ / `do` ✓ per handoff colors) → takeaway. The `do` block is an interactive MC check (tap an option → correct=green / wrong=red). The two completion buttons — **"🤔 Kinda — bring it back"** (surface) and **"Got it ✓"** (gradient) — are **disabled until the check is answered correctly**; "Got it" calls the completion action with `mastered`, "Kinda" with `shaky`. If the concept is already completed, show a single "Back to plan" instead.
- **`src/app/projects/[id]/pills/[conceptId]/pill-actions.ts`** (`"use server"`) — `completePillAction(conceptId, projectId, completion)` → `completePill` → `redirect` to the project.
- **Detail page (`learning` branch)** — the kept-concept list becomes **links** to `/projects/[id]/pills/[conceptId]`, each row showing a state badge: not-started, **done ✓** (`mastered`), or **🤔 revisit** (`shaky`). The "Pills coming soon" placeholder is removed.

### First-open generation UX
The reader page generates synchronously on first open (`getOrCreatePill`). Reuse the existing **"Researching…"-style overlay** as a "Building your pill…" cover so the wait has feedback (a small client wrapper that shows the overlay while the server component streams, or — simpler — a client "Open pill" affordance that shows the overlay during navigation). Implementation detail settled in the plan; the requirement is: first open shows a loading state, not a blank pause.

## Verification

### Automated (TDD)
- **`parsePill`** (pure, unit) — valid pill normalizes; a `read` with neither text nor points is rejected; a `do` with wrong option count or out-of-range `answer` is rejected/coerced; zero `do` blocks throws; two `do` blocks keep only the first; missing takeaway defaults; garbage input throws.
- **`pills.ts`** (integration against Neon, with cleanup) — `getOrCreatePill` generates-and-caches on first call and returns the cached pill on the second **without** regenerating (the `generatePill` dependency is mocked/injected so tests make no live API call and can assert call-count = 1); `completePill` sets `completion` + `completedAt`; `getConceptForReader` returns the right n-of-m index.

> To keep `getOrCreatePill` testable without a live API, `generate-pill` is injected (e.g. `getOrCreatePill(conceptId, generate = generatePill)`) so the test passes a stub. This is the one seam that lets the cache logic be unit/integration-tested deterministically.

### Manual (`npm run dev`)
1. Open a `learning` project → click a kept concept → first time shows the "Building your pill…" overlay, then the Focus reader with read/callout blocks, a `do` check, and a takeaway.
2. Answer the check wrong → completion buttons stay disabled; answer right → they enable.
3. "Got it ✓" → returns to the project; the concept shows **done ✓**. Open another, "Kinda" → shows **🤔 revisit**.
4. Re-open a generated concept → loads instantly (no overlay, cached blocks).
5. A project whose goal stresses an angle → the pill content is visibly tailored to it.

## Explicitly out of scope
The Hub journey UI — Path/Cards/Grid, progress ring, streak (Slice 6); Slack delivery (Slice 6+); reinforcement-pill insertion on "Kinda" and the adaptive plan (Slice 7); spaced repetition (Slice 8); `look`/`watch` blocks and any real image/video; the Layout B "quiet flow" density toggle (Layout A only); regenerating an existing pill (only generate-once + cache; regenerating the whole plan still wipes concepts via Slice 3's `savePlan`, which will null these columns by re-insert).

## Deferred decisions
- Per-pill regenerate ("rebuild this pill") → not now; whole-plan regenerate is the only reset.
- Streaming the generation into the reader vs the overlay → overlay now; streaming later if the wait feels long.
- Normalized `blocks` table → not now; JSON column is sufficient at this scale.
