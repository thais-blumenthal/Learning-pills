# Slice 7 — Slack Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On each project's cadence, a secured cron route posts the next pill to Slack with a deep link into the web app, gated so no more than one pill is ever open at a time.

**Architecture:** A pure decision function (`pickNextDelivery`) chooses send/gated/done from concept state; a pure cadence helper decides slot/weekend eligibility; a Slack adapter posts a Block Kit message; a DB orchestrator (`runDelivery`) ties them together with an injectable `send`; a secured Next.js route handler wires real env + Slack. Gating doubles as idempotency, so the route can't double-send.

**Tech Stack:** Next.js 16 (app-router route handler), Drizzle ORM + Neon Postgres, Slack `chat.postMessage`, Vitest (`dotenv -e .env.local`).

---

## File structure

- `src/db/schema.ts` — **modify**: add `deliveredAt` to `concepts`.
- `src/lib/delivery.ts` — **create**: pure `pickNextDelivery(concepts)`.
- `src/lib/delivery.test.ts` — **create**: pure unit tests.
- `src/lib/cadence.ts` — **create**: pure `eligibleSlots` / `isWeekendInTz` / `isProjectEligible`.
- `src/lib/cadence.test.ts` — **create**: pure unit tests.
- `src/lib/urls.ts` — **modify**: add `pillPath` + `absoluteUrl`.
- `src/lib/urls.test.ts` — **modify**: add tests for the new helpers.
- `src/lib/slack.ts` — **create**: `buildBlocks` + `sendPill` adapter (injectable `fetch`).
- `src/lib/slack.test.ts` — **create**: payload-shape + error tests.
- `src/db/delivery.ts` — **create**: `runDelivery(deps)` orchestrator.
- `src/db/delivery.test.ts` — **create**: real-DB integration tests.
- `src/app/api/cron/deliver/route.ts` — **create**: secured `GET` handler.
- `src/app/api/cron/deliver/route.test.ts` — **create**: auth-rejection tests.

---

## Task 1: Add `deliveredAt` to the concepts schema

**Files:**
- Modify: `src/db/schema.ts:44-59`

- [ ] **Step 1: Add the column**

In `src/db/schema.ts`, inside the `concepts` table, add the `deliveredAt` column right after `completedAt`:

```ts
  completion: text("completion"), // null | 'mastered' | 'shaky'
  completedAt: timestamp("completed_at"),
  deliveredAt: timestamp("delivered_at"), // null until posted to Slack
  createdAt: timestamp("created_at").defaultNow().notNull(),
```

- [ ] **Step 2: Push the schema to the database**

Run: `npm run db:push`
Expected: drizzle-kit reports adding column `delivered_at` to `concepts` and completes without error.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "Slice 7: add deliveredAt column to concepts"
```

---

## Task 2: `pickNextDelivery` pure decision function

**Files:**
- Create: `src/lib/delivery.ts`
- Test: `src/lib/delivery.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/delivery.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pickNextDelivery, type DeliveryConcept } from "./delivery";

// Helper: build a concept with sensible defaults.
const c = (over: Partial<DeliveryConcept> & { id: number; position: number }): DeliveryConcept => ({
  included: true,
  deliveredAt: null,
  completedAt: null,
  ...over,
});

describe("pickNextDelivery", () => {
  it("returns done for no concepts", () => {
    expect(pickNextDelivery([])).toEqual({ kind: "done" });
  });

  it("sends the first included, undelivered concept by position", () => {
    const concepts = [c({ id: 2, position: 2 }), c({ id: 1, position: 1 })];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "send", conceptId: 1 });
  });

  it("skips concepts that are not included", () => {
    const concepts = [c({ id: 1, position: 1, included: false }), c({ id: 2, position: 2 })];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "send", conceptId: 2 });
  });

  it("is gated when a delivered concept is not yet completed", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: null }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "gated" });
  });

  it("sends the next concept once the previous is completed", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: new Date() }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "send", conceptId: 2 });
  });

  it("returns done when every included concept has been delivered", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: new Date() }),
      c({ id: 2, position: 2, deliveredAt: new Date(), completedAt: new Date() }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "done" });
  });

  it("ignores a not-included undelivered concept and returns done", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: new Date() }),
      c({ id: 2, position: 2, included: false }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "done" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/delivery.test.ts`
Expected: FAIL — cannot find module `./delivery`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/delivery.ts`:

```ts
export interface DeliveryConcept {
  id: number;
  position: number;
  included: boolean;
  deliveredAt: Date | null;
  completedAt: Date | null;
}

export type DeliveryDecision =
  | { kind: "send"; conceptId: number }
  | { kind: "gated" }
  | { kind: "done" };

export function pickNextDelivery(concepts: DeliveryConcept[]): DeliveryDecision {
  const included = concepts
    .filter((c) => c.included)
    .sort((a, b) => a.position - b.position);

  // Gated: an already-delivered pill is still open (not completed).
  const hasOpenDelivered = included.some(
    (c) => c.deliveredAt !== null && c.completedAt === null,
  );
  if (hasOpenDelivered) return { kind: "gated" };

  const next = included.find((c) => c.deliveredAt === null);
  if (next) return { kind: "send", conceptId: next.id };

  return { kind: "done" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/delivery.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/delivery.ts src/lib/delivery.test.ts
git commit -m "Slice 7: pickNextDelivery pure decision function + tests"
```

---

## Task 3: Cadence / slot eligibility helpers

**Files:**
- Create: `src/lib/cadence.ts`
- Test: `src/lib/cadence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/cadence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { eligibleSlots, isWeekendInTz, isProjectEligible } from "./cadence";

// Local-time constructor: new Date(year, monthIndex, day) — June is month index 5.
const weekday = new Date(2026, 5, 24, 9, 0, 0); // Wed 2026-06-24
const saturday = new Date(2026, 5, 27, 9, 0, 0); // Sat 2026-06-27
const TZ = "America/New_York";

describe("eligibleSlots", () => {
  it("morning cadence maps to the morning slot only", () => {
    expect(eligibleSlots("morning")).toEqual(["morning"]);
  });
  it("twice cadence maps to both slots", () => {
    expect(eligibleSlots("twice")).toEqual(["morning", "afternoon"]);
  });
  it("weekdays cadence maps to the morning slot only", () => {
    expect(eligibleSlots("weekdays")).toEqual(["morning"]);
  });
});

describe("isWeekendInTz", () => {
  it("is false on a weekday", () => {
    expect(isWeekendInTz(weekday, TZ)).toBe(false);
  });
  it("is true on a Saturday", () => {
    expect(isWeekendInTz(saturday, TZ)).toBe(true);
  });
});

describe("isProjectEligible", () => {
  it("morning cadence is eligible in the morning slot on a weekday", () => {
    expect(isProjectEligible("morning", "morning", weekday, TZ)).toBe(true);
  });
  it("morning cadence is not eligible in the afternoon slot", () => {
    expect(isProjectEligible("morning", "afternoon", weekday, TZ)).toBe(false);
  });
  it("twice cadence is eligible in the afternoon slot", () => {
    expect(isProjectEligible("twice", "afternoon", weekday, TZ)).toBe(true);
  });
  it("weekdays cadence is not eligible on a Saturday", () => {
    expect(isProjectEligible("weekdays", "morning", saturday, TZ)).toBe(false);
  });
  it("morning cadence still fires on a Saturday (no weekday restriction)", () => {
    expect(isProjectEligible("morning", "morning", saturday, TZ)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/cadence.test.ts`
Expected: FAIL — cannot find module `./cadence`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/cadence.ts`:

```ts
export type Slot = "morning" | "afternoon";

export function eligibleSlots(cadence: string): Slot[] {
  if (cadence === "twice") return ["morning", "afternoon"];
  return ["morning"]; // morning + weekdays
}

export function isWeekendInTz(date: Date, timeZone: string): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return weekday === "Sat" || weekday === "Sun";
}

export function isProjectEligible(
  cadence: string,
  slot: Slot,
  now: Date,
  timeZone: string,
): boolean {
  if (!eligibleSlots(cadence).includes(slot)) return false;
  if (cadence === "weekdays" && isWeekendInTz(now, timeZone)) return false;
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/cadence.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cadence.ts src/lib/cadence.test.ts
git commit -m "Slice 7: cadence/slot eligibility helpers + tests"
```

---

## Task 4: Deep-link URL helpers

**Files:**
- Modify: `src/lib/urls.ts`
- Test: `src/lib/urls.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/urls.test.ts` (add the import for the new helpers to the existing import line if present, otherwise add a new import):

```ts
import { pillPath, absoluteUrl } from "./urls";

describe("pillPath", () => {
  it("builds the reader path from project and concept ids", () => {
    expect(pillPath(7, 42)).toBe("/projects/7/pills/42");
  });
});

describe("absoluteUrl", () => {
  it("joins a base url and a path", () => {
    expect(absoluteUrl("https://app.example.com", "/projects/7/pills/42")).toBe(
      "https://app.example.com/projects/7/pills/42",
    );
  });
  it("strips a trailing slash on the base url", () => {
    expect(absoluteUrl("https://app.example.com/", "/x")).toBe(
      "https://app.example.com/x",
    );
  });
});
```

Note: if `src/lib/urls.test.ts` does not already import `describe`/`it`/`expect`, add `import { describe, expect, it } from "vitest";` at the top.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/urls.test.ts`
Expected: FAIL — `pillPath`/`absoluteUrl` are not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/urls.ts`:

```ts
export function pillPath(projectId: number, conceptId: number): string {
  return `/projects/${projectId}/pills/${conceptId}`;
}

export function absoluteUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/urls.test.ts`
Expected: PASS (existing tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/urls.ts src/lib/urls.test.ts
git commit -m "Slice 7: pillPath + absoluteUrl deep-link helpers + tests"
```

---

## Task 5: Slack adapter

**Files:**
- Create: `src/lib/slack.ts`
- Test: `src/lib/slack.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/slack.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildBlocks, sendPill, type PillMessage } from "./slack";

const msg: PillMessage = {
  channel: "C123",
  emoji: "🧠",
  projectName: "Stoicism",
  pillTitle: "Premeditatio Malorum",
  hook: "Rehearse the worst, fear it less.",
  minutes: 3,
  url: "https://app.example.com/projects/1/pills/2",
};

describe("buildBlocks", () => {
  it("includes the title, hook, minutes, and a deep-link button", () => {
    const blocks = buildBlocks(msg);
    const json = JSON.stringify(blocks);
    expect(json).toContain("Premeditatio Malorum");
    expect(json).toContain("Rehearse the worst");
    expect(json).toContain("~3 min");
    const action = blocks.find((b) => b.type === "actions");
    expect(action.elements[0].url).toBe(msg.url);
  });
});

describe("sendPill", () => {
  it("POSTs to chat.postMessage with the bearer token and channel", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    await sendPill(msg, "xoxb-token", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect(init.headers.Authorization).toBe("Bearer xoxb-token");
    const body = JSON.parse(init.body);
    expect(body.channel).toBe("C123");
    expect(Array.isArray(body.blocks)).toBe(true);
  });

  it("throws when Slack responds with ok:false", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ ok: false, error: "channel_not_found" })),
    );
    await expect(sendPill(msg, "xoxb-token", fetchFn)).rejects.toThrow("channel_not_found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/slack.test.ts`
Expected: FAIL — cannot find module `./slack`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/slack.ts`:

```ts
export interface PillMessage {
  channel: string;
  emoji: string | null;
  projectName: string;
  pillTitle: string;
  hook: string;
  minutes: number;
  url: string;
}

type FetchFn = typeof fetch;

export function buildBlocks(msg: PillMessage): any[] {
  const heading = `${msg.emoji ? msg.emoji + " " : ""}*${msg.projectName}*`;
  return [
    { type: "section", text: { type: "mrkdwn", text: heading } },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${msg.pillTitle}*\n${msg.hook}  ·  ~${msg.minutes} min` },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open today's pill →", emoji: true },
          url: msg.url,
          style: "primary",
        },
      ],
    },
  ];
}

export async function sendPill(
  msg: PillMessage,
  token: string,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  const res = await fetchFn("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: msg.channel,
      text: `${msg.projectName}: ${msg.pillTitle}`, // fallback for notifications
      blocks: buildBlocks(msg),
    }),
  });
  // Slack returns HTTP 200 with { ok: false, error } on failures.
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack error: ${data.error ?? res.status}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/slack.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slack.ts src/lib/slack.test.ts
git commit -m "Slice 7: Slack adapter (buildBlocks + sendPill) + tests"
```

---

## Task 6: `runDelivery` orchestrator (real DB)

**Files:**
- Create: `src/db/delivery.ts`
- Test: `src/db/delivery.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/db/delivery.test.ts`. This follows the real-DB pattern from `src/db/pills.test.ts` (seed → assert → `afterEach` cleanup):

```ts
import { afterEach, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { createProject } from "./projects";
import { savePlan } from "./plan";
import { runDelivery } from "./delivery";

const createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.delete(concepts).where(eq(concepts.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }
  createdIds.length = 0;
});

// A fixed weekday so cadence weekend logic never interferes.
const now = new Date(2026, 5, 24, 9, 0, 0); // Wed 2026-06-24

async function seedLearningProject() {
  const project = await createProject({ name: "Deliver Test", urls: [], cadence: "morning" });
  createdIds.push(project.id);
  await db.update(projects).set({ status: "learning" }).where(eq(projects.id, project.id));
  await savePlan(project.id, {
    emoji: "x",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 1 },
      { title: "B", hook: "h", minutes: 1 },
    ],
  });
  const rows = await db
    .select()
    .from(concepts)
    .where(eq(concepts.projectId, project.id));
  rows.sort((a, b) => a.position - b.position);
  return { projectId: project.id, first: rows[0], second: rows[1] };
}

test("sends the first pill and stamps deliveredAt", async () => {
  const { first } = await seedLearningProject();
  const send = vi.fn(async () => {});

  const summary = await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send });

  expect(send).toHaveBeenCalledTimes(1);
  expect(summary.sent).toBe(1);
  const [row] = await db.select().from(concepts).where(eq(concepts.id, first.id));
  expect(row.deliveredAt).not.toBeNull();
});

test("is gated on the next run until the first pill is completed", async () => {
  await seedLearningProject();
  const send = vi.fn(async () => {});

  await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send }); // sends first
  const summary = await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send }); // gated

  expect(send).toHaveBeenCalledTimes(1); // not called again
  expect(summary.gated).toBe(1);
});

test("sends the second pill once the first is completed", async () => {
  const { first, second } = await seedLearningProject();
  const send = vi.fn(async () => {});

  await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send }); // sends first
  await db.update(concepts).set({ completedAt: now }).where(eq(concepts.id, first.id));
  const summary = await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send });

  expect(summary.sent).toBe(1);
  const [row] = await db.select().from(concepts).where(eq(concepts.id, second.id));
  expect(row.deliveredAt).not.toBeNull();
});

test("skips a project whose cadence excludes this slot", async () => {
  await seedLearningProject(); // cadence "morning"
  const send = vi.fn(async () => {});

  const summary = await runDelivery({ slot: "afternoon", now, timeZone: "America/New_York", send });

  expect(send).not.toHaveBeenCalled();
  expect(summary.considered).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/db/delivery.test.ts`
Expected: FAIL — cannot find module `./delivery`.

- [ ] **Step 3: Write minimal implementation**

Create `src/db/delivery.ts`:

```ts
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { pickNextDelivery } from "@/lib/delivery";
import { isProjectEligible, type Slot } from "@/lib/cadence";

type Project = typeof projects.$inferSelect;
type Concept = typeof concepts.$inferSelect;

export interface DeliverDeps {
  slot: Slot;
  now: Date;
  timeZone: string;
  send: (project: Project, concept: Concept) => Promise<void>;
}

export interface DeliverSummary {
  considered: number;
  sent: number;
  gated: number;
  done: number;
  errors: number;
}

export async function runDelivery(deps: DeliverDeps): Promise<DeliverSummary> {
  const summary: DeliverSummary = { considered: 0, sent: 0, gated: 0, done: 0, errors: 0 };

  const learning = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "learning"));

  for (const project of learning) {
    if (!isProjectEligible(project.cadence, deps.slot, deps.now, deps.timeZone)) continue;
    summary.considered++;

    const rows = await db
      .select()
      .from(concepts)
      .where(eq(concepts.projectId, project.id))
      .orderBy(asc(concepts.position));

    const decision = pickNextDelivery(rows);
    if (decision.kind === "gated") {
      summary.gated++;
      continue;
    }
    if (decision.kind === "done") {
      summary.done++;
      continue;
    }

    const concept = rows.find((c) => c.id === decision.conceptId)!;
    try {
      await deps.send(project, concept);
      await db.update(concepts).set({ deliveredAt: deps.now }).where(eq(concepts.id, concept.id));
      summary.sent++;
    } catch {
      summary.errors++;
    }
  }

  return summary;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/db/delivery.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/delivery.ts src/db/delivery.test.ts
git commit -m "Slice 7: runDelivery orchestrator + real-DB tests"
```

---

## Task 7: Secured cron route

**Files:**
- Create: `src/app/api/cron/deliver/route.ts`
- Test: `src/app/api/cron/deliver/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/cron/deliver/route.test.ts`. Tests cover the auth gate only — orchestration is verified in Task 6, the Slack adapter in Task 5:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ORIGINAL = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
});
afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL;
});

const call = (headers: Record<string, string>) =>
  GET(new Request("https://app.example.com/api/cron/deliver?slot=morning", { headers }));

describe("GET /api/cron/deliver auth", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const res = await call({});
    expect(res.status).toBe(401);
  });

  it("returns 401 when the secret is wrong", async () => {
    const res = await call({ Authorization: "Bearer nope" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/cron/deliver/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/cron/deliver/route.ts`:

```ts
import { NextResponse } from "next/server";
import { runDelivery } from "@/db/delivery";
import { sendPill } from "@/lib/slack";
import { pillPath, absoluteUrl } from "@/lib/urls";
import type { Slot } from "@/lib/cadence";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slotParam = new URL(request.url).searchParams.get("slot");
  const slot: Slot = slotParam === "afternoon" ? "afternoon" : "morning";

  const token = process.env.SLACK_BOT_TOKEN!;
  const channel = process.env.SLACK_CHANNEL_ID!;
  const baseUrl = process.env.APP_URL!;
  const timeZone = process.env.APP_TZ ?? "UTC";

  const summary = await runDelivery({
    slot,
    now: new Date(),
    timeZone,
    send: async (project, concept) => {
      await sendPill(
        {
          channel,
          emoji: project.emoji,
          projectName: project.name,
          pillTitle: concept.title,
          hook: concept.hook,
          minutes: concept.minutes,
          url: absoluteUrl(baseUrl, pillPath(project.id, concept.id)),
        },
        token,
      );
    },
  });

  return NextResponse.json({ slot, ...summary });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/cron/deliver/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test`
Expected: all suites pass.

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/deliver/route.ts src/app/api/cron/deliver/route.test.ts
git commit -m "Slice 7: secured /api/cron/deliver route + auth tests"
```

---

## Task 8: Document env vars + scheduling

**Files:**
- Modify: `docs/design-handoff/README.md` (the "Slack Delivery (backend)" section)
- Create or modify: `.env.example` (if the repo has one; otherwise add a note to the README)

- [ ] **Step 1: Document the new env vars and how to schedule**

Update the "Slack Delivery (backend)" section of `docs/design-handoff/README.md` to reflect that it is now implemented, listing the env vars and the scheduling contract:

```markdown
## Slack Delivery (backend) — implemented in Slice 7

A secured cron route posts the next pill to Slack on each project's cadence.

**Endpoint:** `GET /api/cron/deliver?slot=morning|afternoon`
Requires header `Authorization: Bearer $CRON_SECRET`.

**Scheduling:** point any scheduler (Vercel Cron, GitHub Actions, system cron) at the
endpoint. Call with `slot=morning` once each morning, and additionally `slot=afternoon`
for twice-daily projects. The route filters projects by cadence + `APP_TZ` weekend rules;
gating ensures no more than one open pill per project, so extra calls are safe (idempotent).

**Env vars:**
- `SLACK_BOT_TOKEN` — bot token used for `chat.postMessage`
- `SLACK_CHANNEL_ID` — recipient channel (single recipient for now)
- `CRON_SECRET` — shared secret guarding the route
- `APP_URL` — base URL for absolute deep links
- `APP_TZ` — timezone for cadence weekend/slot logic (defaults to `UTC`)
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-handoff/README.md
git commit -m "Slice 7: document Slack delivery env vars + scheduling"
```

---

## Manual verification (after all tasks)

Set the env vars in `.env.local` (`SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`, `CRON_SECRET`, `APP_URL`, `APP_TZ`) and ensure at least one project has `status = 'learning'` with included concepts. Then:

```bash
npm run dev
# in another shell:
curl -s -H "Authorization: Bearer <your CRON_SECRET>" \
  "http://localhost:3000/api/cron/deliver?slot=morning"
```

Expected: a JSON summary like `{"slot":"morning","considered":1,"sent":1,"gated":0,"done":0,"errors":0}` and a Slack message in the configured channel with a working "Open today's pill →" button. A second immediate call should return `"gated":1` and send nothing.

---

## Self-review notes

- **Spec coverage:** `pickNextDelivery` (Task 2) ↔ decision function; `deliveredAt` column (Task 1) ↔ data model; Slack adapter (Task 5) ↔ unit 2; `runDelivery` (Task 6) ↔ unit 3 orchestration; route + auth (Task 7) ↔ cron route; cadence/slot/TZ (Task 3) ↔ timing; deep links (Task 4) ↔ message URL; env + scheduling docs (Task 8) ↔ env table. All spec sections covered.
- **Type consistency:** `DeliveryConcept` is the pure-function shape; `runDelivery` passes Drizzle `concepts.$inferSelect` rows which structurally satisfy it. `Slot` is defined once in `cadence.ts` and imported everywhere. `PillMessage` fields match the route's `send` call site.
- **No placeholders:** every code step is complete.
