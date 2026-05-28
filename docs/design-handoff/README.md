# Handoff: Learning Pills — ADHD-friendly micro-learning hub

## Overview
**Learning Pills** turns any topic into a sequence of tiny, finishable learning "pills." The full product loop:

1. **Create a project** — name a topic and drop in reference materials (links, PDFs, notes).
2. **Research** — an AI reads the materials + does its own research.
3. **Plan review** — the AI proposes ~5–7 core concepts, easiest-first. The user keeps/drops concepts and approves.
4. **Pills are generated** and delivered on a cadence (the user receives a **Slack** message each morning that deep-links into the web app for that day's pill).
5. **Learn** — each pill is a short, mixed-media lesson read in a focused, one-thing-on-screen reader.
6. **Signal understanding** — after a quick check the user taps **"Got it"** or **"Kinda — bring it back."**
7. **Adapt** — "Kinda" inserts a reinforcement pill; **spaced repetition** periodically resurfaces older concepts to confirm retention. Users can also **add more materials mid-project**, which re-adapts the plan.

The design is explicitly **ADHD-first**: tiny chunks, visible progress + streaks, one focus at a time, dopamine rewards (confetti), per-block "what does this ask of me" pacing tags, and easy resume.

The visual style is a deliberately playful **"gen-Z bubble / neon / unicorn"** aesthetic (gradient mesh background, rounded bubbly surfaces, gradient headings + buttons, rainbow accents), with two alternate themes (neon-dark, warm-calm).

---

## About the Design Files
The files in `design_files/` are **design references built in HTML/React + Babel (in-browser)** — interactive prototypes that show the intended look and behavior. **They are not production code to copy directly.** The task is to **recreate these designs in the target codebase's environment** (e.g. a real React/Next app, Vue, SwiftUI, etc.) using its established patterns, component library, router, and state management. If no environment exists yet, choose an appropriate framework (a React + TypeScript SPA is a natural fit) and implement there.

Notable prototype shortcuts to replace with real implementations:
- **AI calls** use a sandbox helper `window.claude.complete(...)`. Replace with the real model/backend (see *AI Integration*).
- **Persistence** is `localStorage`. Replace with a real datastore + auth.
- **Slack delivery** is represented only by UI affordances (a delivery indicator + "delivered this morning" label). The actual Slack bot / scheduler is a backend concern (see *Slack Delivery*).
- **Media** is shown with striped placeholders; wire to real uploaded/linked assets.
- The two HTML files share JSX component files but are **separate prototypes**; in production they are one app.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, gradients, and interactions are final and intended to be matched closely. Exact tokens are listed under *Design Tokens*. Recreate pixel-closely, but use the target codebase's own component primitives where sensible.

---

## Screens / Views

> Layout container: content is centered in a column. Projects/Create/Plan/Hub use a max-width column (Projects ~920px, Create ~600px, Plan ~720px, Hub ~940px) centered on the page, over a fixed full-viewport gradient-mesh background. The **Focus/pill reader** is a full-screen overlay. Mobile: single column, path layout collapses spine to the left.

### 1. Projects (home)
- **Purpose:** see all learning projects, resume one, or start a new one.
- **Layout:** kicker label ("LEARNING PILLS"), big gradient H1 ("Your learning projects"), subtitle, then a responsive card grid (`repeat(auto-fill, minmax(248px, 1fr))`, gap 16px).
- **Components:**
  - **New project card** — dashed 2px border, rounded 22px, a gradient rounded-square "+" chip (44px, radius 13px), "New project" (Fredoka 18px 600), subtitle "Add a topic + your materials". Hover: border → accent, lift 2px.
  - **Project card** — white surface, radius 22px, padding 22px, colored shadow. Top row: topic emoji (34px, with a soft colored drop-shadow) + status badge. Name (Fredoka 21px 700), topic subtitle (13.5px dim). If learning: a 6px progress bar (gradient fill). Footer: delivery cadence with a send icon, and a "Review plan →" or "Continue →" CTA (accent). Hover: lift 3px, accent border + shadow.
  - **Status badge** variants: `researching` ("Researching…", neutral track bg), `review` ("Plan ready to review", **gradient bg, white text**), `learning` ("3/6 pills", accent-2 tint bg).
- **Behavior:** click a `review`/`researching` project → Plan review; click a `learning` project → Hub.

### 2. Create project
- **Purpose:** name the topic, attach materials, set delivery cadence.
- **Layout (≤600px column):** back link ("‹ Projects"), gradient H1 ("Start a new project"), then labeled fields.
- **Components:**
  - **Project name** — large text input (20px), radius 14px, 1px border, focus → accent border. Placeholder "e.g. Hermes agent".
  - **Reference materials** — a **dropzone** (dashed 2px, radius 16px, doc icon + "Drag files here"; on dragover → accent tint). Plus a **link/note row**: text input + "Add" button (gradient). Added materials render as **material chips** (icon by type: link/pdf/note, label, removable ✕). When empty, shows quick-add sample chips.
  - **Delivery cadence** — segmented buttons: "Each morning" / "Twice a day" / "Weekdays only" (selected = gradient bg white text).
  - **Submit** — full-width gradient button "Research & build my plan →", disabled until a name is entered.
- **Behavior:** submit → Researching screen (kicks off AI generation in the background).

### 3. Researching (loading)
- **Purpose:** cover the latency of research/plan generation.
- **Layout:** centered. A pulsing neon **orb** (3 expanding rings, pink/purple/cyan), the topic title in quotes (gradient), the material chips, and a **checklist of steps** that advance one-by-one (~640ms each): "Reading your materials…" → "Cross-checking with fresh research…" → "Pulling out the core concepts…" → "Sequencing them easiest-first…" → "Drafting your learning plan…". Completed steps get a filled gradient check dot.
- **Behavior:** when the animation finishes AND generation resolves → Plan review.

### 4. Plan review
- **Purpose:** approve/trim the proposed concepts before pills are built.
- **Layout (≤720px column):** back link, kicker "PLAN READY · FROM YOUR MATERIALS", gradient H1 ("Here's the plan for "<name>""), subtitle. A vertical **list of concept rows**. A **sticky footer** summarizes count/time and holds the approve button.
- **Components:**
  - **Concept row** — surface, radius 14px, padding 16px: a drag-handle (6-dot grip, decorative), a gradient number chip (26px, radius 8px), title (Fredoka 17px 600) + one-line hook (13.5px dim), minutes ("3m"), and an **include toggle** (pill switch, 46×27; on = gradient, knob slides with a ✓; off = track bg with ✕, whole row dims to 50%).
  - **Sticky footer** — "{n} pills · ~{min} min total · drips to Slack" + **"Approve & create pills ✓"** (gradient, disabled if 0 concepts kept). Footer has a translucent blurred bg.
- **Behavior:** toggling include/exclude updates the count live; approve → project becomes `learning`, only kept concepts become the pill sequence → Hub.

### 5. Hub (the journey)
- **Purpose:** the project's pills, progress, delivery status; entry point into each pill.
- **Header:** back link ("‹ All projects"), title row (emoji + gradient project name + topic blurb). **Stats row** (3 cards, flex, min 170px each):
  - Progress card — a **progress ring** (SVG, accent stroke, animates) + "{done}/{total} pills done".
  - Streak card — "🔥 {n}" (Fredoka 26px) + "day streak / keep it warm".
  - Delivery card — a gradient send-icon chip + "Slack · {cadence}" + "next pill drips automatically".
  - **Controls row:** a **view-as segmented switch** (Path / Cards / Grid; selected = gradient) and an **"+ Add fuel ✨"** button (gradient-border pill) shown only for `learning` projects.
- **Spaced-review banner** (conditional, see *Interactions*): full-width card, accent border, refresh icon, "Spaced review — Quick — do you still remember "{concept}"?", "Check →", dismiss ✕.
- **Finish banner** (when 100%): "🎉 You finished {project}! …".
- **Body — three metaphors for the same pill list:**
  - **Path (default):** a vertical candy-ribbon **spine** (dashed gradient) with alternating left/right cards. Each pill = a circular **node** (60px) + a card. Node states: **done** = rainbow gradient fill + white check (the gradient hue cycles per index, see *Rainbow palette*); **current** = white with colored ring + pulsing halo + number; **locked** = muted surface + lock icon. Card shows "PILL n" (colored), minutes, title; current shows "Start now →"; done shows "Completed"; a pill flagged shaky shows "🤔 Marked to revisit"; a reinforcement pill shows a dashed accent-2 node with 💪 and a "💪 REINFORCE" tag.
  - **Cards:** horizontal scroll-snap deck of larger cards (radius 20px) — index, status badge, title, hook, minutes, open/review CTA.
  - **Grid:** responsive tile grid (`minmax(190px,1fr)`) — status badge, title, minutes.
- **Behavior:** clicking an available/done pill → Focus reader at that pill. Locked pills are disabled.

### 6. Focus reader — the mixed-media lesson  ⭐ (the core screen — use **Layout A · Labeled blocks**)
- **Purpose:** read one pill, one thing on screen. **A pill's body is an ordered sequence of typed content blocks.**
- **Layout:** full-screen overlay, flex column:
  - **Top bar:** "‹ Plan" back, a thin **progress fill** bar (gradient), "◷ {min} min".
  - **Body (scrollable, max-width ~640px):** "PILL n OF m" (gradient kicker) → gradient **title** → then the **block sequence** → a **takeaway** (gradient left-border, Fredoka).
  - **Footer (two-tier completion):** a back-step button + either two buttons — **"🤔 Kinda — bring it back"** (surface) and **"Got it ✓"** (gradient) — both enabled only after the inline check is answered correctly; or, if already done, a single "Next pill / Finish →".
- **Block model — the important part. Each block has a `kind` and renders with a color-coded "kind-tag" chip (Layout A):**
  | kind | tag label | tag color | renders |
  |---|---|---|---|
  | `read` | 📖 READ | purple `#8b3fd6` on `#a855f7`@14% | a paragraph or a bulleted key-points list |
  | `look` | 👆 LOOK (+ hint e.g. "tap a step") | cyan `#0f8aa8` on `#1fb6d6`@16% | an **interactive diagram** (clickable nodes reveal explanations) OR an **image + caption** |
  | `watch` | ▶ WATCH (+ "45 sec") | pink `#c01f8e` on `#d6249f`@14% | an **inline video** block (poster, gradient play button, duration pill) + caption |
  | `do` | ✓ DO (+ "quick check") | green `#198a64` on `#1f9e74`@16% | an **inline multiple-choice check** (tap to answer; correct = green, wrong = red) |
  | `callout` | (use READ styling) | — | a tinted gradient "PICTURE THIS ✦" analogy aside |
  - Blocks are separated by a 1px dashed divider (Layout A). **Layout B ("Quiet flow")** is the same content with kind-tags + dividers hidden — keep this as an optional density toggle, but **A is the chosen default.**
  - The kind-tags are both a **pacing cue** (the user always knows what each block asks) and the **content model**: a pill = `{ title, minutes, blocks: Block[] }` where `Block = { kind, hint?, ... }`. Authoring a pill = ordering typed blocks.
- **Interactive diagram** (`look`): nodes in a row with arrows + a "↻ repeat" marker; tapping a node sets it active (gradient fill) and shows a one-line explanation below. Generalize to any small node set.
- **Inline check** (`do`): tapping an option reveals correct/incorrect; correct answer enables the completion buttons.

### 7. Add resources (mid-project modal)
- **Purpose:** drop more materials into a live project and re-adapt the plan.
- **Layout:** centered modal over a blurred scrim. Rainbow "✨ ADD FUEL" tag, heading "Found more? Toss it in.", note. Shows existing materials ("Already in: …" chips), a link/note input + Add, new material chips, and **"Re-adapt plan ✨"** (disabled until something is added).
- **Behavior:** submit → an **"Adapt overlay"** ("Re-reading your new materials…" → "Updating your plan…") → a new concept pill is generated and appended → a **toast** confirms ("✨ Plan grew — added "{title}"") or, if nothing new, "Your plan already covers that — nice!".

### 8. Spaced review (modal)
- **Purpose:** resurface an older concept to confirm retention.
- **Layout:** centered modal: "🔁 SPACED REVIEW" tag, "Still got this from earlier?", the concept title, its check question + options. On answer: feedback ("✓ Still locked in. Nice." / "Worth another look — keeping it in rotation.") + Done.
- **Behavior:** answering correctly upgrades a `shaky` concept back to `mastered`. Triggered from the hub banner.

### 9. Toasts
Pill-shaped, gradient bg, white Fredoka text, bottom-center, auto-dismiss ~3s. Used for plan-adapted / plan-grew / AI-fallback messages.

---

## Interactions & Behavior
- **Two-tier completion:** the pill's inline `do` check must be answered correctly to enable completion. "Got it" = `mastered` (fires confetti); "Kinda — bring it back" = `shaky`.
- **Adaptive plan (Kinda):** marking a pill `shaky` **inserts a reinforcement pill immediately after it** in the sequence — title "Lock in: {title}", 1 min, a quick re-take using the same check + a recap (its hook/analogy). Reinforcement pills are visually distinct (dashed accent-2 node, 💪 "REINFORCE" tag) and never recurse. A toast confirms "💪 Plan adapted — added a quick re-take."
- **Spaced repetition:** once ≥2 non-reinforcement pills are done, the hub surfaces a review banner. It prefers a `shaky` concept, else the oldest completed one. Dismissible.
- **Add resources → re-adapt:** appends a newly-generated concept pill to the end of the sequence (only if it adds something new).
- **Confetti:** ~70 neon particles burst on `mastered` completion (skip when reduce-motion is on).
- **Progress & resume:** progress, streak, and `shaky` flags persist; the user resumes where they left off.
- **Streak:** increments the first time a pill is completed on a new calendar day.
- **Animations:** focus overlay scale/fade-in (.3s), node pulse halo, orb rings, toast spring-in, progress-ring stroke (.6s). All disabled under **reduce motion**.
- **Reduce motion:** a toggle that disables all animations/transitions and confetti.

## State Management
Per **project**:
- `id, name, topicId, status` (`researching | review | learning`), `cadence`, `materials: {type,label}[]`
- `includedIds: string[] | null` — the **ordered** pill sequence (null until plan approved → defaults to all topic concepts)
- `extraPills: Pill[]` — runtime-added pills (reinforcements + resource-added concepts), referenced by id from `includedIds`
- `done: { [pillId]: 'mastered' | 'shaky' }`, `streak: number`, `lastDay: string`

Derived: `pills` = `includedIds` mapped over the pool `[...topicConcepts, ...extraPills]`; `completedSet`, `shakySet`, first-incomplete index, percent complete.

A **Pill**: `{ id, title, minutes, blocks: Block[] }` (the prototype currently flattens to `hook/analogy/points/check/takeaway`; **production should use the typed `blocks[]` model** described in the Focus reader — see `pill-layouts.jsx` for the block components).

App-level: current view/route, active project id, focus index, modal/overlay flags, toast message, tweak settings (theme/font/metaphor/density/reduce-motion).

Persistence in the prototype is `localStorage`; replace with a real datastore + auth.

## AI Integration
- **Plan generation** (custom topics): one call returns JSON for ~5 concepts. Prompt shape (see `app.jsx` → `aiGenerateTopic`): asks for `{emoji, blurb, pills:[{title, minutes, hook, analogy, points[3], check:{q, options[3], answer}, takeaway}]}`, exactly 5 pills, concise strings. Parse defensively (slice first `{`…last `}`), validate shape, **fall back** to a sample/authored plan on any failure.
- **Resource-added concept:** one call returns a single concept pill in the same shape (`aiExtraPill`).
- Prototype caps output at 1024 tokens via `window.claude.complete`; in production, generating full **mixed-media** pills (with diagram/video block specs) likely needs either a larger budget or **lazy per-pill generation** (generate the plan = titles+hooks first, then generate each pill's blocks when opened). Author the block list as structured output (`blocks:[{kind, ...}]`).

## Slack Delivery (backend)
External to these designs. The web app only shows: the delivery cadence (chosen at create + on the hub card) and a "delivered this morning" label in the reader. Production needs a scheduler + Slack bot that, per the cadence, posts the next pill with a deep link (e.g. `/project/:id/pill/:n`) into the web app. "Done" in the app is what advances delivery.

---

## Design Tokens

### Themes (CSS custom properties set on a root wrapper)
**Unicorn (default, light):**
```
--bg:#f3ecff  --surface:#ffffff  --surface-2:#fbf6ff
--text:#2a1b46  --text-dim:#8b7aa8  --border-solid:#ece0fb  --track:#2a1b4612
--accent:#d6249f  --accent-2:#1fb6d6  --accent-soft:rgba(214,36,159,.12)
--grad:linear-gradient(135deg,#ff5fa2 0%,#a855f7 50%,#22b8d6 100%)
--grad-text:linear-gradient(120deg,#ff3d97,#a855f7 45%,#16a5c9)
--glow:0 16px 44px -12px rgba(168,85,247,.55)
mesh blobs: --m1:#ffd1ec --m2:#d9c8ff --m3:#c8f5ff --m4:#fff4c8
```
**Cyber (neon dark):**
```
--bg:#0d0a1e  --surface:#171232  --surface-2:#211a42
--text:#f1e9ff  --text-dim:#9c8cc8  --border-solid:#2d2456  --track:#ffffff14
--accent:#ff5fa2  --accent-2:#22e3c4  --accent-soft:rgba(255,95,162,.18)
--grad:linear-gradient(135deg,#ff5fa2 0%,#7c3aed 50%,#22d3ee 100%)
--glow:0 0 34px -2px rgba(124,58,237,.7)
mesh blobs: --m1:#3a1d6e --m2:#6e1d5b --m3:#1d4d6e --m4:#1d6e57
```
**Calm (warm light):**
```
--bg:#f7f4ec  --surface:#ffffff  --surface-2:#fbf8f1
--text:#221f17  --text-dim:#7d7765  --border-solid:#e7e1d3  --track:#221f1712
--accent:#e8633a  --accent-2:#1f9e74  --grad:linear-gradient(135deg,#e8633a,#e8a23a)
```
Mesh background: a fixed full-viewport layer of four corner radial-gradients using `--m1..4`.

### Block kind-tag colors (Focus reader)
- READ: text `#8b3fd6` on `#a855f7`@14%
- LOOK: text `#0f8aa8` on `#1fb6d6`@16%
- WATCH: text `#c01f8e` on `#d6249f`@14%
- DO: text `#198a64` on `#1f9e74`@16%
- Check correct: `#1f9e74`; check wrong: `#d8553f`

### Rainbow node palette (Path metaphor, cycles per pill index)
`#ff5fa2, #a855f7, #22b8d6, #f59e0b, #22c55e, #ec4899, #6366f1, #06b6d4`
Done node bg = `linear-gradient(140deg, hue[i], hue[i+2])`.

### Confetti palette
`#ff5fa2, #a855f7, #22d3ee, #fde047, #22c55e, #fb7185`

### Typography
- **Headings/labels:** Fredoka (weights 400–700). Alternatives offered: Baloo 2; classic = Bricolage Grotesque.
- **Body:** Nunito (400–900). Classic pairing uses Public Sans.
- Big gradient titles use `background:var(--grad-text)` + `background-clip:text` + transparent fill.
- Scale (reader): step kicker ~11.5px/700/.14em tracking; title ~30px Fredoka 600; body 16–17px/1.5; points 15px; takeaway 17px Fredoka.

### Spacing, radius, shadow
- Radii: surfaces/cards **22px**; inner cards/rows **14–18px**; chips/buttons **11–13px**; pills/toggles **999px**.
- Shadows: colored, e.g. cards `0 10px 30px -18px (accent@40%)`; primary buttons use `--glow`.
- Density toggle scales spacing ×0.8 (compact) / ×1 / ×1.22 (comfy).
- Min hit target ≥44px; node 60px; toggle 46×27.

### Iconography
Simple line icons (check, lock, clock, arrow, send, refresh, plus, x, grid, link, doc, note, play) — single-stroke, `currentColor`. A few status accents use emoji (🔥 streak, 🤔 revisit, 💪 reinforce, ✨, 🎉) consistent with the playful brand.

---

## Assets
No external image/icon assets — icons are inline SVG, decorative graphics are CSS gradients. **All images/videos in the designs are placeholders** (dashed boxes with monospace labels like `▦ image`, `▶ 0:45`); production wires these to user-uploaded/linked media per `look`/`watch`/image blocks.

---

## Files (in `design_files/`)
**Learning Hub** (the full product prototype):
- `Learning Hub.html` — host page: fonts, full stylesheet (all screens + the bubble/neon layer), script load order.
- `data.js` — sample authored topics (AI agents, stock market, espresso), each with concepts + materials; `PROJECTS` seed; `EXTRAS` (fallback bonus concepts for add-resources).
- `app.jsx` — top-level state, routing, themes, AI generation, adaptive logic, tweaks. **Start here.**
- `screens.jsx` — Projects, CreateProject, Researching, PlanReview, FocusPill, SpacedReview, AddResources, AdaptOverlay, Toast.
- `components.jsx` — Icon set, ProgressRing, Confetti, the three hub metaphors (Path/Cards/Grid).
- `tweaks-panel.jsx` — the in-prototype settings panel (theme/font/metaphor/density/reduce-motion); not part of the product UI.

**Pill Media Layouts** (the mixed-media lesson exploration — the chosen reader direction):
- `Pill Media Layouts.html` — host page + reader/block stylesheet.
- `pill-layouts.jsx` — **the block components**: `Ktag` (kind tag), `LoopDiagram` (clickable diagram), `VideoPh`/`ImagePh` (media), `CheckBlock` (inline check), `Block`/`Lesson` composition, and the block-kit cards. **This is the reference for the production block model. Layout A (labeled blocks) is the chosen default.**
- `design-canvas.jsx` — the pan/zoom canvas used only to present the options side-by-side; **not part of the product** (ignore for implementation).

> The two prototypes share component/style vocabulary but render as separate pages. In production they are one app: the Learning Hub flow with the Focus reader rebuilt on the typed-block model from `pill-layouts.jsx`.
