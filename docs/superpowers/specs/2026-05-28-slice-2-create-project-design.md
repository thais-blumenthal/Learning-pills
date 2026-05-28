# Slice 2 — App skeleton + Create Project

**Date:** 2026-05-28
**Status:** Approved design (pending written-spec review)

## Where this sits

Learning Pills turns a topic + reference materials into a sequence of tiny, finishable
"pills" delivered to Slack, with spaced repetition — designed ADHD-first. The full product
loop (per the design handoff): create project → research → plan review → generate pills →
deliver to Slack → "Got it / Kinda" → adapt → spaced review.

We build it in vertical slices:

| Slice | What you get |
|---|---|
| **2 (this spec)** | Next.js app skeleton + theme foundation; create / list / view a project (name, goal, URLs, cadence) stored in Neon |
| 3 | Research materials → draft learning plan |
| 4 | Review & approve plan (concept rows + include toggles) |
| 5 | Generate pills (typed-block model from the handoff) |
| 6 | Deliver to Slack on a cadence (deep links into the app) |
| 7 | "Got it / Kinda" feedback → adaptive reinforcement pills |
| 8 | Spaced-repetition resurfacing of older concepts |

**Current state:** Neon Postgres + Drizzle (`src/db`, tables `modules`/`chunks`), plus
standalone tsx scripts (`hello.ts` Slack post, `ingest.ts` Claude chunking). Those scripts
stay as working references and are folded in / retired as later slices reach them.

**Design source of truth:** `docs/design-handoff/` (copied from the design team's handoff).
High-fidelity: tokens, themes, fonts, and per-screen layout are final. Slice 2 implements
two of its screens (Projects home, Create project) and stands up the shared theme foundation.

## Goal of Slice 2

A thin but real vertical slice: stand up the Next.js app with the design's theme foundation,
and let the user **create a project** (name + goal + pasted URLs + delivery cadence), **see a
list** of projects, and **view one**. Nothing reads the URLs yet — Slice 2 only *captures* the
project so Slice 3 has something to work with.

## Stack & foundation

- **Next.js (App Router) + TypeScript**, run locally with `npm run dev`. The handoff confirms
  a React + TS target; Next.js gives us React UI *and* server-side code (for the later
  Anthropic/Slack/DB work) in one local app. No auth, no deployment — single-user, localhost.
- **Drizzle + Neon** via existing `src/db` (`neon-http` driver), unchanged.
- **Env:** existing `.env.local` (`DATABASE_URL`, `SLACK_BOT_TOKEN`, `ANTHROPIC_API_KEY`).
  Next.js loads `.env.local` automatically; DB/secret access stays server-side only.
- **Theme foundation** (built once, reused by every later screen), from the handoff tokens:
  CSS-variable token set with the **Unicorn** theme as default, Fredoka + Nunito fonts, the
  fixed gradient-mesh background, and base radii/shadows. The Cyber/Calm theme switcher is
  *deferred* — we ship Unicorn only for now.

This converts the repo from "tsx scripts" into a Next.js app (adds `app/`, `next.config`,
`tsconfig`, `react`/`react-dom`/`next` deps). `src/db` and the existing scripts are preserved.

## Data model (additive — existing tables untouched)

```
projects
  id         serial PK
  name       text not null              -- "Hermes agent"
  goal       text                       -- "I want to build a working Hermes agent..."
  cadence    text not null default 'morning'   -- 'morning' | 'twice' | 'weekdays'  (stored only)
  createdAt  timestamp not null default now

sources
  id         serial PK
  projectId  integer not null FK -> projects.id
  url        text not null
  createdAt  timestamp not null default now
```

- URLs live in their own `sources` table (not a column on `projects`) so Slice 3 can add
  per-source fields (fetched content, fetch status) with no rework.
- `cadence` is stored only; nothing acts on it until Slice 6.
- **No `status` column yet** — the design's `researching | review | learning` states arrive
  with research in Slice 3. A freshly created project simply lands on its detail page.
- **No file/PDF materials, ever** — URLs only, by decision. The design's file dropzone is
  omitted; we keep the link-row + material-chip pattern.
- Migration via existing `drizzle-kit`.

## Screens (Slice 2 subset of the handoff)

Built to the handoff's visual spec; see `docs/design-handoff/README.md` §Screens and the
`design_files/` prototypes for exact styling.

1. **Projects home (`/`)** — handoff §1. Responsive card grid of projects (name + goal as the
   subtitle, cadence in the footer) plus the dashed **"New project"** card. Empty state when
   none. *Deferred from the full design this slice:* status badges and progress bars (no
   learning state exists yet) — cards link to the project detail page.
2. **Create project (`/projects/new`)** — handoff §2, adapted:
   - **Name** — large text input, placeholder "e.g. Hermes agent".
   - **Goal** — textarea (*our addition* to the design; "what I'm trying to get out of this").
   - **Reference materials** — link-row (URL input + "Add") rendering removable **material
     chips**. No file dropzone.
   - **Delivery cadence** — segmented buttons (Each morning / Twice a day / Weekdays only),
     default "Each morning". Stored only.
   - **Submit** — gradient button, disabled until a name is entered. In Slice 2, submit
     **saves and redirects to the project detail page** (no Researching screen yet).
3. **Project detail (`/projects/[id]`)** — read-only: name, goal, the list of URLs, and
   cadence, with a **disabled "Generate learning plan →"** button as the placeholder hinge
   into Slice 3.

## Architecture & decoupling

- **Data layer** (e.g. `src/db/projects.ts`): `createProject(input)`, `listProjects()`,
  `getProject(id)`. Pages call these; pages stay thin.
- **URL normalizer util** (`src/lib/urls.ts`): trims, drops blanks, dedupes, basic validation
  (must parse as an http(s) URL). Used both by the client chip UI and server-side in
  `createProject` (never trust the client).
- **Create flow** is a Next.js **server action** that validates input, inserts the `projects`
  row + one `sources` row per URL, and redirects to the detail page.
- DB/secret access is server-side only.

## Error handling

- Name required: submit disabled client-side **and** rejected server-side.
- URLs: invalid entries rejected at add-time in the chip UI and re-validated server-side;
  duplicates collapsed.
- Empty states on the home grid and the detail URL list.

## Verification

- **Unit tests** for the pieces with real logic:
  - URL normalizer — trims, drops blanks, dedupes, accepts valid http(s), rejects junk.
  - `createProject` — inserts the project and the right `sources` rows (against a test/dev DB).
- **Manual:** `npm run dev`, create a real project with a couple of URLs, confirm it appears
  on the home grid and renders correctly on the detail page.

## Explicitly out of scope (later slices)

Reading/fetching URLs, research, learning plan, plan review, pill generation, the Focus
reader / typed-block model, Slack delivery, cadence enforcement, status transitions,
spaced repetition, file/PDF upload, theme switcher (Cyber/Calm), auth.

## Deferred decisions

- `status` column and badges → Slice 3 (with research).
- Cyber/Calm theme switcher → later; Unicorn default ships now.
- Notes/non-URL materials → not planned (URLs only).
