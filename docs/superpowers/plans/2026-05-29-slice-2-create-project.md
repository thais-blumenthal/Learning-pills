# Slice 2 — Create Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a local Next.js app (with the design handoff's theme foundation) that lets the user create, list, and view a learning project — name, goal, pasted URLs, and delivery cadence — stored in Neon Postgres.

**Architecture:** Convert the current tsx-scripts repo into a single Next.js (App Router) + TypeScript app. The existing Drizzle/Neon `src/db` layer is preserved and extended with two new tables (`projects`, `sources`). A pure URL-normalizer util and a thin data-access layer (`createProject`/`listProjects`/`getProject`) hold all logic and are unit/integration tested; React pages stay thin and call them. Project creation runs through a Next.js server action. DB/secret access is server-side only.

**Tech Stack:** Next.js (App Router), React, TypeScript, Drizzle ORM + Neon serverless Postgres, Vitest (node env) for tests, `dotenv-cli` to feed `.env.local` to drizzle-kit/vitest, `next/font/google` for Fredoka + Nunito.

**Spec:** `docs/superpowers/specs/2026-05-28-slice-2-create-project-design.md`
**Design source of truth:** `docs/design-handoff/` (README §Screens 1–2, §Design Tokens; `design_files/screens.jsx` Projects + CreateProject for exact styling).

---

## File Structure

**Create:**
- `tsconfig.json` — TypeScript config for Next.js (path alias `@/* → ./src/*`; excludes `scripts/`).
- `next.config.ts` — minimal Next config.
- `vitest.config.ts` — node test env + `@` alias.
- `src/app/globals.css` — Unicorn theme tokens + mesh background + base component classes (the reusable theme foundation).
- `src/app/layout.tsx` — root layout: fonts, theme wrapper, mesh background, page container.
- `src/app/page.tsx` — Projects home (server component): project grid + "New project" card.
- `src/app/projects/new/page.tsx` — Create project page (thin server component).
- `src/app/projects/new/CreateProjectForm.tsx` — client component: name, goal, URL chips, cadence picker.
- `src/app/projects/new/actions.ts` — `createProjectAction` server action.
- `src/app/projects/[id]/page.tsx` — Project detail (server component): name, goal, URLs, disabled plan button.
- `src/lib/urls.ts` — `isValidHttpUrl`, `normalizeUrls` (pure).
- `src/lib/urls.test.ts` — unit tests for the normalizer.
- `src/db/projects.ts` — `createProject`, `listProjects`, `getProject` + `Cadence`/`CreateProjectInput` types.
- `src/db/projects.test.ts` — integration test (inserts + cleans up against the dev DB).

**Modify:**
- `package.json` — add deps + scripts.
- `.gitignore` — add Next.js build artifacts.
- `src/db/schema.ts` — add `projects` + `sources` tables.

**Preserve untouched:** `src/db/index.ts`, `scripts/*.ts`, `drizzle.config.ts`, existing `modules`/`chunks` tables.

---

## Task 1: Scaffold the Next.js app

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/page.tsx`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install next@latest react@latest react-dom@latest
```
Expected: packages added to `dependencies`, no errors.

- [ ] **Step 2: Install dev dependencies**

Run:
```bash
npm install -D typescript @types/node @types/react @types/react-dom vitest dotenv-cli
```
Expected: packages added to `devDependencies`.

- [ ] **Step 3: Add scripts to `package.json`**

Replace the `"scripts"` block in `package.json` with exactly:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "dotenv -e .env.local -- vitest run",
    "test:watch": "dotenv -e .env.local -- vitest",
    "db:push": "dotenv -e .env.local -- drizzle-kit push"
  },
```
(`next dev/build/start` auto-load `.env.local`; only `vitest` and `drizzle-kit` need `dotenv-cli`.)

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "scripts"]
}
```
(`scripts/` is excluded so the existing tsx scripts don't break `next build` type-checking; they keep running via `npx tsx`.)

- [ ] **Step 5: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 7: Add Next.js artifacts to `.gitignore`**

Append these lines to `.gitignore`:
```
.next
next-env.d.ts
*.tsbuildinfo
```

- [ ] **Step 8: Create a minimal root layout + home page so the app boots**

The App Router requires a root layout; without it `next dev` errors. Both files are replaced with the real versions in Task 2 / Task 6.

`src/app/layout.tsx`:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function HomePage() {
  return <h1>Learning Pills</h1>;
}
```

- [ ] **Step 9: Verify the app boots**

Run:
```bash
npm run dev
```
Open http://localhost:3000 — expect a page showing "Learning Pills" (unstyled). Next auto-generates `next-env.d.ts` on first run. Stop the dev server (Ctrl-C).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Slice 2: scaffold Next.js app + tooling"
```

---

## Task 2: Theme foundation (tokens, fonts, layout, mesh background)

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/app/globals.css`**

Token values are the Unicorn theme from `docs/design-handoff/README.md` §Design Tokens.
```css
:root {
  --bg: #f3ecff;
  --surface: #ffffff;
  --surface-2: #fbf6ff;
  --text: #2a1b46;
  --text-dim: #8b7aa8;
  --border-solid: #ece0fb;
  --track: #2a1b4612;
  --accent: #d6249f;
  --accent-2: #1fb6d6;
  --accent-soft: rgba(214, 36, 159, 0.12);
  --grad: linear-gradient(135deg, #ff5fa2 0%, #a855f7 50%, #22b8d6 100%);
  --grad-text: linear-gradient(120deg, #ff3d97, #a855f7 45%, #16a5c9);
  --glow: 0 16px 44px -12px rgba(168, 85, 247, 0.55);
  --m1: #ffd1ec;
  --m2: #d9c8ff;
  --m3: #c8f5ff;
  --m4: #fff4c8;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-nunito), system-ui, sans-serif;
  min-height: 100vh;
}

/* fixed full-viewport gradient-mesh background */
.mesh {
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(40% 40% at 12% 12%, var(--m1), transparent),
    radial-gradient(40% 40% at 88% 18%, var(--m2), transparent),
    radial-gradient(45% 45% at 18% 85%, var(--m3), transparent),
    radial-gradient(40% 40% at 85% 88%, var(--m4), transparent);
}

.container {
  max-width: 940px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}

.kicker {
  font-family: var(--font-fredoka), sans-serif;
  font-weight: 700;
  letter-spacing: 0.14em;
  font-size: 11.5px;
  color: var(--text-dim);
  margin: 0 0 8px;
}

.gradient-title {
  font-family: var(--font-fredoka), sans-serif;
  font-weight: 700;
  font-size: 34px;
  margin: 0 0 6px;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtitle { color: var(--text-dim); margin: 0 0 28px; }

.back-link {
  display: inline-block;
  color: var(--text-dim);
  text-decoration: none;
  margin-bottom: 16px;
  font-weight: 600;
}

/* project grid + cards */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 22px;
  padding: 22px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.project-card {
  background: var(--surface);
  border: 1px solid var(--border-solid);
  box-shadow: 0 10px 30px -18px rgba(214, 36, 159, 0.4);
}
.project-card:hover { transform: translateY(-3px); border-color: var(--accent); }

.new-card {
  border: 2px dashed var(--border-solid);
  align-items: flex-start;
}
.new-card:hover { transform: translateY(-2px); border-color: var(--accent); }

.plus-chip {
  width: 44px; height: 44px;
  display: grid; place-items: center;
  border-radius: 13px;
  background: var(--grad);
  color: #fff; font-size: 26px; line-height: 1;
}

.new-title { font-family: var(--font-fredoka), sans-serif; font-weight: 600; font-size: 18px; }
.new-sub, .project-goal { color: var(--text-dim); font-size: 13.5px; }
.project-name { font-family: var(--font-fredoka), sans-serif; font-weight: 700; font-size: 21px; margin: 0; }
.cadence { color: var(--text-dim); font-size: 13px; }

/* form controls */
.field { display: block; margin: 0 0 20px; }
.field-label { display: block; font-weight: 700; margin-bottom: 8px; }

.input, .textarea {
  width: 100%;
  border: 1px solid var(--border-solid);
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  background: var(--surface);
  color: var(--text);
}
.input:focus, .textarea:focus { outline: none; border-color: var(--accent); }
.input-lg { font-size: 20px; }
.textarea { min-height: 90px; resize: vertical; }

.row { display: flex; gap: 8px; }

.btn-gradient {
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  background: var(--grad);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--glow);
}
.btn-gradient:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.btn-block { width: 100%; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-soft);
  color: var(--text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13.5px;
}
.chip button {
  border: none; background: none; cursor: pointer;
  color: var(--text-dim); font-size: 15px; line-height: 1;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

.segmented { display: flex; gap: 8px; flex-wrap: wrap; }
.segmented button {
  border: 1px solid var(--border-solid);
  background: var(--surface);
  border-radius: 999px;
  padding: 9px 16px;
  font: inherit;
  cursor: pointer;
  color: var(--text);
}
.segmented button[aria-pressed="true"] {
  background: var(--grad);
  color: #fff;
  border-color: transparent;
}

.error { color: #d8553f; font-size: 13.5px; margin-top: 6px; }

.materials-list { padding-left: 18px; }
.materials-list a { color: var(--accent); }

.narrow { max-width: 600px; }
```

- [ ] **Step 2: Replace `src/app/layout.tsx` (created minimally in Task 1) with the themed layout**

```tsx
import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Learning Pills",
  description: "ADHD-friendly micro-learning, delivered to Slack.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${nunito.variable}`}>
        <div className="mesh" aria-hidden="true" />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the theme renders**

Run `npm run dev`, open http://localhost:3000. Expect the "Learning Pills" placeholder on the soft-purple mesh background with the Nunito font applied. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Slice 2: theme foundation (Unicorn tokens, fonts, layout, mesh bg)"
```

---

## Task 3: Add `projects` and `sources` tables

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the tables to `src/db/schema.ts`**

Append to the end of `src/db/schema.ts` (the existing `import` line already includes `serial`, `integer`, `text`, `timestamp`, `pgTable`):
```ts
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal"),
  cadence: text("cadence").default("morning").notNull(), // 'morning' | 'twice' | 'weekdays'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Push the schema to Neon**

Run:
```bash
npm run db:push
```
Expected: drizzle-kit reports creating tables `projects` and `sources` and applies the changes. If prompted to confirm creating new tables, accept.

- [ ] **Step 3: Verify the tables exist**

Run (reuses the existing helper script; `--env-file` loads the DB URL):
```bash
npx tsx --env-file=.env.local scripts/check-tables.ts
```
Expected: the printed `Tables:` array includes `projects` and `sources` (alongside `modules`, `chunks`).

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "Slice 2: add projects + sources tables"
```

---

## Task 4: URL normalizer (pure, TDD)

**Files:**
- Create: `src/lib/urls.test.ts`
- Create: `src/lib/urls.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/urls.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isValidHttpUrl, normalizeUrls } from "./urls";

describe("isValidHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isValidHttpUrl("https://example.com")).toBe(true);
    expect(isValidHttpUrl("http://example.com/path")).toBe(true);
  });
  it("rejects non-urls and non-http protocols", () => {
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });
});

describe("normalizeUrls", () => {
  it("trims, drops blanks and invalids, dedupes, preserves order", () => {
    const input = [
      "  https://a.com  ",
      "https://a.com",
      "",
      "   ",
      "garbage",
      "http://b.com",
    ];
    expect(normalizeUrls(input)).toEqual(["https://a.com", "http://b.com"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm test -- src/lib/urls.test.ts
```
Expected: FAIL — cannot resolve `./urls` / functions not defined.

- [ ] **Step 3: Write the implementation**

`src/lib/urls.ts`:
```ts
export function isValidHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export function normalizeUrls(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed || !isValidHttpUrl(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm test -- src/lib/urls.test.ts
```
Expected: PASS (2 files? — just this file; all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/urls.ts src/lib/urls.test.ts
git commit -m "Slice 2: URL normalizer util + tests"
```

---

## Task 5: Project data layer (TDD, integration)

**Files:**
- Create: `src/db/projects.test.ts`
- Create: `src/db/projects.ts`

> Note: this test hits the dev Neon database (requires network + a valid `DATABASE_URL` in `.env.local`) and cleans up the rows it creates.

- [ ] **Step 1: Write the failing test**

`src/db/projects.test.ts`:
```ts
import { afterEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources } from "./schema";
import { createProject, getProject, listProjects } from "./projects";

const createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.delete(sources).where(eq(sources.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }
  createdIds.length = 0;
});

test("createProject trims the name, normalizes URLs, and stores everything", async () => {
  const project = await createProject({
    name: "  Test Hermes  ",
    goal: "  learn it  ",
    urls: ["https://a.com", "https://a.com", " ", "not-a-url", "http://b.com"],
    cadence: "morning",
  });
  createdIds.push(project.id);

  expect(project.name).toBe("Test Hermes");

  const fetched = await getProject(project.id);
  expect(fetched).not.toBeNull();
  expect(fetched!.goal).toBe("learn it");
  expect(fetched!.cadence).toBe("morning");
  expect(fetched!.sources.map((s) => s.url)).toEqual(["https://a.com", "http://b.com"]);
});

test("listProjects returns a created project", async () => {
  const project = await createProject({
    name: "Listed Project",
    urls: [],
    cadence: "weekdays",
  });
  createdIds.push(project.id);

  const all = await listProjects();
  expect(all.some((p) => p.id === project.id)).toBe(true);
});

test("createProject rejects an empty name", async () => {
  await expect(
    createProject({ name: "   ", urls: [], cadence: "morning" }),
  ).rejects.toThrow(/name/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm test -- src/db/projects.test.ts
```
Expected: FAIL — cannot resolve `./projects`.

- [ ] **Step 3: Write the implementation**

`src/db/projects.ts`:
```ts
import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources } from "./schema";
import { normalizeUrls } from "@/lib/urls";

export type Cadence = "morning" | "twice" | "weekdays";

export interface CreateProjectInput {
  name: string;
  goal?: string;
  urls: string[];
  cadence: Cadence;
}

export async function createProject(input: CreateProjectInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Project name is required");

  const goal = input.goal?.trim() || null;
  const urls = normalizeUrls(input.urls);

  const [project] = await db
    .insert(projects)
    .values({ name, goal, cadence: input.cadence })
    .returning();

  if (urls.length > 0) {
    await db.insert(sources).values(urls.map((url) => ({ projectId: project.id, url })));
  }

  return project;
}

export async function listProjects() {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProject(id: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return null;
  const projectSources = await db
    .select()
    .from(sources)
    .where(eq(sources.projectId, id))
    .orderBy(sources.id);
  return { ...project, sources: projectSources };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm test -- src/db/projects.test.ts
```
Expected: PASS — 3 tests green; the created rows are deleted by `afterEach`.

- [ ] **Step 5: Commit**

```bash
git add src/db/projects.ts src/db/projects.test.ts
git commit -m "Slice 2: project data layer (create/list/get) + tests"
```

---

## Task 6: Projects home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx` with the projects grid**

```tsx
import Link from "next/link";
import { listProjects } from "@/db/projects";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  morning: "Each morning",
  twice: "Twice a day",
  weekdays: "Weekdays only",
};

export default async function HomePage() {
  const projects = await listProjects();

  return (
    <>
      <p className="kicker">LEARNING PILLS</p>
      <h1 className="gradient-title">Your learning projects</h1>
      <p className="subtitle">Bite-sized lessons, delivered to Slack.</p>

      <div className="grid">
        <Link href="/projects/new" className="card new-card">
          <span className="plus-chip">+</span>
          <span className="new-title">New project</span>
          <span className="new-sub">Add a topic + your materials</span>
        </Link>

        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="card project-card">
            <h2 className="project-name">{project.name}</h2>
            {project.goal && <p className="project-goal">{project.goal}</p>}
            <span className="cadence">↗ {CADENCE_LABEL[project.cadence] ?? project.cadence}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
```
(When there are no projects, only the dashed "New project" card shows — that is the empty state.)

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open http://localhost:3000. Expect the gradient "Your learning projects" heading and a dashed "New project" card. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Slice 2: projects home page"
```

---

## Task 7: Create-project form + server action

**Files:**
- Create: `src/app/projects/new/actions.ts`
- Create: `src/app/projects/new/CreateProjectForm.tsx`
- Create: `src/app/projects/new/page.tsx`

- [ ] **Step 1: Create the server action**

`src/app/projects/new/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createProject, type Cadence } from "@/db/projects";

export interface CreateProjectFormInput {
  name: string;
  goal: string;
  urls: string[];
  cadence: string;
}

export async function createProjectAction(input: CreateProjectFormInput) {
  if (!input.name.trim()) {
    throw new Error("Project name is required");
  }
  const project = await createProject({
    name: input.name,
    goal: input.goal,
    urls: input.urls,
    cadence: input.cadence as Cadence,
  });
  redirect(`/projects/${project.id}`);
}
```

- [ ] **Step 2: Create the client form component**

`src/app/projects/new/CreateProjectForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { isValidHttpUrl } from "@/lib/urls";
import { createProjectAction } from "./actions";

const CADENCES = [
  { value: "morning", label: "Each morning" },
  { value: "twice", label: "Twice a day" },
  { value: "weekdays", label: "Weekdays only" },
] as const;

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [cadence, setCadence] = useState<string>("morning");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addUrl() {
    const value = urlInput.trim();
    if (!value) return;
    if (!isValidHttpUrl(value)) {
      setError("That doesn't look like a valid URL (must start with http:// or https://).");
      return;
    }
    if (!urls.includes(value)) setUrls([...urls, value]);
    setUrlInput("");
    setError("");
  }

  function removeUrl(target: string) {
    setUrls(urls.filter((u) => u !== target));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await createProjectAction({ name, goal, urls, cadence });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Project name</span>
        <input
          className="input input-lg"
          placeholder="e.g. Hermes agent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">What do you want to get out of this?</span>
        <textarea
          className="textarea"
          placeholder="e.g. Build a working Hermes agent and understand its core abstractions."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">Reference materials (paste a URL)</span>
        <div className="row">
          <input
            className="input"
            placeholder="https://…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <button type="button" className="btn-gradient" onClick={addUrl}>
            Add
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {urls.length > 0 && (
          <div className="chips">
            {urls.map((url) => (
              <span key={url} className="chip">
                🔗 {url}
                <button type="button" aria-label={`Remove ${url}`} onClick={() => removeUrl(url)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">Delivery cadence</span>
        <div className="segmented">
          {CADENCES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={cadence === c.value}
              onClick={() => setCadence(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-gradient btn-block" disabled={!name.trim() || submitting}>
        {submitting ? "Saving…" : "Research & build my plan →"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the page**

`src/app/projects/new/page.tsx`:
```tsx
import Link from "next/link";
import { CreateProjectForm } from "./CreateProjectForm";

export default function NewProjectPage() {
  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ Projects</Link>
      <h1 className="gradient-title">Start a new project</h1>
      <p className="subtitle">Name it, say what you want from it, and drop in some links.</p>
      <CreateProjectForm />
    </div>
  );
}
```

- [ ] **Step 4: Verify the create flow**

Run `npm run dev`, go to http://localhost:3000, click "New project". Enter a name (button enables), add a couple of URLs (they appear as removable chips; invalid input shows the error), pick a cadence, submit. Expect a redirect to `/projects/<id>` (the detail page — built next; for now it may 404 until Task 8). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/new
git commit -m "Slice 2: create-project form + server action"
```

---

## Task 8: Project detail page

**Files:**
- Create: `src/app/projects/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

`src/app/projects/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";

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
  const project = await getProject(Number(id));
  if (!project) notFound();

  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ All projects</Link>
      <h1 className="gradient-title">{project.name}</h1>
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

      <button className="btn-gradient" disabled style={{ marginTop: 24 }}>
        Generate learning plan →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify end-to-end**

Run `npm run dev`. Create a new project (Task 7 flow), confirm you land on the detail page showing the name, goal, your URLs as links, the cadence, and a greyed-out "Generate learning plan →" button. Go back to home — the new project now appears in the grid and clicking it reopens the detail page. Stop the server.

- [ ] **Step 3: Run the full test suite**

Run:
```bash
npm test
```
Expected: all tests in `src/lib/urls.test.ts` and `src/db/projects.test.ts` PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/\[id\]
git commit -m "Slice 2: project detail page"
```

---

## Done criteria

- `npm run dev` serves the themed app locally.
- A project can be created (name + goal + URLs + cadence), appears on the home grid, and opens a detail page showing its stored data.
- `npm test` is green.
- `projects` and `sources` tables exist in Neon.
- No research/plan/pills/Slack — those are later slices.
