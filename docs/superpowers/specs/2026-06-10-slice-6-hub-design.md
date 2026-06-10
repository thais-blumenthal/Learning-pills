---
shaping: true
---

# Slice 6 — The Hub (the journey)

**Date:** 2026-06-10
**Status:** Shaping — scope agreed, pending plan + written-spec review

## Where this sits

Learning Pills loop: create → research → draft plan → review & approve → generate pills + read them (Slice 5) → **see the journey & resume pills in the Hub (this slice)** → deliver to Slack → "Got it/Kinda" adaptation → spaced review.

Slice 5 left the `learning` status rendering a plain linked concept list on `/projects/[id]`. Slice 6 replaces that list with the **Hub**: the project's home once it's in `learning`, showing progress, a streak, delivery status, and three views of the same pill sequence. Home → click a `learning` project → Hub (no new route; the Hub *is* the `learning` branch of the existing project page).

## Decomposition note

The full Hub design (handoff §5) includes a spaced-review banner, reinforcement-pill nodes, and an "+ Add fuel" action. All three depend on backend features not yet built (spaced repetition, the "Kinda → reinforcement" adaptation, mid-project re-research). Those are **deferred to later slices**, not stubbed. This slice builds everything the current data model can fully support.

## Goal of Slice 6

Turn the `learning` project page into the Hub: a header, three stat cards (progress / streak / delivery), a Path/Cards/Grid view switch over the pill sequence with done/current/locked node states, sequential locking, and a finish banner at 100% — all driven by existing `concepts.completion` / `completedAt` / `projects.cadence` data.

## Data model

**No schema changes.** Everything is derived from existing columns:

- **Progress** — `done = concepts.filter(completion !== null).length`, `total = includedConcepts.length`.
- **Current pill** — first included concept with `completion === null` (in `position` order). Everything before it is done/attempted; everything after is **locked**.
- **Streak** — derived in a pure helper from the set of distinct local-calendar dates in `completedAt` across the project's concepts: count consecutive days ending today (or yesterday, to not break a streak before the day's first pill). Lives in `src/lib/streak.ts` + `streak.test.ts` so it's unit-testable without the DB.
- **Delivery** — `projects.cadence` ('morning' | 'twice' | 'weekdays') → static "Slack · {label}" label. No live Slack in this slice.

## Pill node state (the locking rule)

Per concept, computed server-side and passed to the views:

| State | Condition | Openable? | Visual |
|-------|-----------|-----------|--------|
| `done` | `completion === "mastered"` | yes | rainbow gradient node + ✓ ("Completed"; `shaky` adds "🤔 Marked to revisit") |
| `shaky` | `completion === "shaky"` | yes | same node, revisit tag |
| `current` | first concept with `completion === null` | yes | white node + colored ring + pulsing halo + number ("Start now →") |
| `locked` | any `completion === null` after `current` | **no** | muted node + 🔒, card disabled |

Clicking a `done`/`shaky`/`current` node → Focus reader at that pill (existing `/projects/[id]/pills/[conceptId]` route). Locked nodes are non-interactive.

## Components

**Modify `src/app/projects/[id]/page.tsx`** — replace the `learning` branch's `<ol className="concept-list">…</ol>` block with `<Hub …/>`, passing the project (name/emoji/blurb/cadence), the derived per-concept node states, progress, and streak. The "Edit plan / Regenerate plan" row stays (moves under/into the Hub controls). Researching/review/draft branches unchanged.

**Create `src/app/projects/[id]/Hub.tsx`** (client component — holds the view-switch state):
- **Header** — emoji + gradient project name + blurb.
- **Stats row** — three cards:
  - *Progress*: SVG progress ring (accent stroke, animates on mount) + "{done}/{total} pills done".
  - *Streak*: "🔥 {n}" + "day streak / keep it warm".
  - *Delivery*: gradient send-icon chip + "Slack · {cadence label}" + "next pill drips automatically".
- **Controls row** — Path / Cards / Grid segmented switch (selected = gradient); the existing Edit-plan / Regenerate-plan actions. ("+ Add fuel ✨" deferred.)
- **Finish banner** — shown when `done === total`: "🎉 You finished {project}!".
- Renders one of three sub-views based on local switch state.

**Create `src/app/projects/[id]/hub-views.tsx`** (or three small components):
- **PathView (default)** — vertical dashed-gradient spine, alternating left/right cards, circular nodes per the state table; rainbow hue cycles per index (palette per handoff "Rainbow palette" / design tokens). Done nodes ✓; current node pulsing halo + "Start now →"; locked nodes 🔒 + disabled card.
- **CardsView** — horizontal scroll-snap deck (radius 20px): index, status badge, title, hook, minutes, open/locked CTA.
- **GridView** — responsive tile grid (`minmax(190px,1fr)`): status badge, title, minutes.

Available/done nodes are `next/link`s to the reader; locked render as plain disabled markup (no link).

**Append to `src/app/globals.css`** — Hub layout, stat cards, progress ring, segmented switch, path spine + node states (done/current/locked + halo animation), cards deck, grid tiles, finish banner. Reuse existing tokens (gradient, accent, surface, Fredoka) and the rainbow palette from the design tokens.

## Verification

### Automated (TDD)
- `src/lib/streak.ts` + `streak.test.ts` — pure streak helper: 0 when nothing done; counts consecutive days; ignores gaps; today-or-yesterday tolerance; dedupes multiple completions on one day.
- Node-state derivation helper (current/locked computation) unit-tested if extracted to `src/lib/`.

### Manual (`npm run dev`)
On a `learning` project (e.g. Hermes / 232):
1. Hub renders header + 3 stat cards; progress ring matches done/total; streak shows a number.
2. Path is default: done nodes ✓, the first incomplete is `current` with "Start now →", later pills show 🔒 and don't navigate.
3. Switch to Cards → horizontal deck; Grid → tile grid; same states.
4. Click `current` → Focus reader at that pill; complete it → back on Hub the ring advances and the next pill becomes `current`.
5. Complete all → finish banner appears; no `current`/`locked` left.
6. Delivery card shows "Slack · {cadence}" matching the project's cadence.

## Explicitly out of scope
- Spaced-review banner, reinforcement-pill nodes, "+ Add fuel ✨" — later slices (need spaced-rep model, adaptation, mid-project re-research).
- Real Slack delivery / scheduler — delivery card is a static label only.
- Drag-to-reorder on the path spine (decorative grip only, as in plan review).
- Confetti on finish — nice-to-have, can fold into a later polish slice.

## Deferred decisions
- Streak semantics (does a missed day reset to 0, or grace period?) — start with strict consecutive-days, today-or-yesterday tolerance; revisit when delivery exists.
- Whether the Hub becomes the home-card click target now (handoff says home→learning→Hub); already true since the Hub is the `learning` branch — no routing change needed.
