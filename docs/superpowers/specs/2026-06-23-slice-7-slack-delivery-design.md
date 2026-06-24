# Slice 7 — Slack Delivery (design)

## Context

The Learning Pills loop is: create project → research → draft plan → review & approve → generate pills → **deliver to Slack (this slice)** → feedback → spaced review.

Through Slice 6 (the Hub), Slack exists only as UI affordances — a cadence label, a delivery card, and "delivered this morning" text. Nothing actually talks to Slack. This slice builds the real pipe: a scheduler trigger that, on each project's cadence, posts the next pill to Slack with a deep link into the web app. "Done" in the app is what advances delivery.

## Scope decisions

- **Personal scale now, scalable seams.** One Slack workspace, one recipient (env-configured). No OAuth, no per-user linking. But the boundaries are drawn so multi-tenant is an additive change, not a rewrite.
- **Notification-only Slack.** The message deep-links into the web app; "Got it / Kinda" stays in the app. No inbound Slack interactivity, event subscriptions, or signing handshake.
- **Don't pile up (gated delivery).** Never more than one open pill at a time. If the previous pill isn't done, the cron sends nothing (silent — no nudge).
- **Cron → protected API route.** A secured route does the work; an external scheduler (Vercel Cron, GitHub Actions, or system cron) hits it on a schedule. Host-agnostic.

## Architecture

Three isolated units, each independently testable:

### 1. `pickNextDelivery(concepts)` — pure decision function

No I/O, no clock, no Slack. Given a project's concepts with their `included` / `deliveredAt` / `completedAt` state, returns one of:

- `{ kind: "send", conceptId }` — the next pill to deliver
- `{ kind: "gated" }` — a delivered pill is not yet completed → send nothing
- `{ kind: "done" }` — every included concept has been delivered

Rules:

- Consider only `included === true` concepts, ordered by `position` ascending.
- **Gated** if any included concept has `deliveredAt != null` and `completedAt == null` (i.e. an open, already-delivered pill exists).
- Otherwise **next pill** = the first included concept with `deliveredAt == null`.
- If none remain undelivered → **done**.

This is the brain. Gating also provides idempotency: once a pill is sent and stamped, every subsequent call is gated until it is completed, so the route cannot double-send regardless of how often it is hit.

### 2. Slack adapter — `sendPill(message)`

Reads `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` from env and calls Slack `chat.postMessage` with a Block Kit payload. `fetch` is injectable for testing.

The recipient (channel) is a single env value today. The scalable seam: later it becomes a per-project / per-user channel passed in as an argument; the adapter body is unchanged.

Failure handling for now: throw on non-OK Slack response; the route logs and moves on to the next project. No retry/backoff queue this slice.

### 3. Cron route — `GET /api/cron/deliver?slot=morning|afternoon`

- **Auth:** require a shared secret (`CRON_SECRET`) via header (e.g. `Authorization: Bearer <secret>`). Reject with 401 if missing/mismatched.
- **Eligibility per project** (only `status === "learning"` projects):
  - `weekdays` cadence: skip if today (in `APP_TZ`) is Sat/Sun.
  - Slot mapping: `morning` → `[morning]`; `twice` → `[morning, afternoon]`; `weekdays` → `[morning]`. Skip the project if the request's `slot` is not in its set.
- For each eligible project: load concepts, run `pickNextDelivery`.
  - On `send`: call the Slack adapter with the pill message, then stamp `deliveredAt = now` on that concept.
  - On `gated` / `done`: do nothing.
- Return a JSON summary (counts: considered / sent / gated / done / errors) for observability.

Cadence controls **how often the external scheduler polls**, not bespoke per-project timing. The scheduler is configured to call the route at the morning and (for twice-daily) afternoon slots.

## Data model change

Add one nullable column to `concepts`:

```
deliveredAt timestamp   -- null until the pill is posted to Slack
```

No other schema changes. `completedAt` already exists and is what gating reads.

## Message format (Block Kit, low-text / ADHD-friendly)

```
{emoji} {Project name}
*{Pill title}*
{hook}  ·  ~{minutes} min
[ Open today's pill → ]   ← button, deep-links to the web app
```

- Button URL is absolute: `APP_URL` + `/projects/{projectId}/pills/{conceptId}`.
- Add `pillUrl(projectId, conceptId)` and an absolute-URL helper to `src/lib/urls.ts`.

## Env vars introduced

| Var | Purpose |
|-----|---------|
| `SLACK_BOT_TOKEN` | Bot token for `chat.postMessage` |
| `SLACK_CHANNEL_ID` | Single recipient channel (scalable seam → per-project later) |
| `CRON_SECRET` | Shared secret guarding the cron route |
| `APP_URL` | Base URL for absolute deep links |
| `APP_TZ` | Timezone for cadence weekend/slot logic (single TZ now → per-user later) |

## Testing

- **`pickNextDelivery`** — pure unit tests: next-pill ordering, skips non-`included`, gated when an open delivered pill exists, all-done, empty.
- **Cadence / slot eligibility** — pure unit tests including `APP_TZ` weekend logic and slot mapping.
- **Slack adapter** — assert the Block Kit payload shape and auth header with an injected `fetch`; assert it throws on non-OK response.
- **Cron route** — auth rejection (missing/bad secret → 401), stamps `deliveredAt`, calls the adapter only for eligible projects, returns the summary. Slack mocked.

## Out of scope (later slices)

- OAuth / multi-workspace install flow, per-workspace tokens.
- Per-user / per-project channel linking (the seam is in place; the UI + storage are not).
- Inbound Slack interactivity (completing "Got it / Kinda" from Slack).
- Reminder nudges for unfinished pills (delivery is silently gated).
- Delivery retry / backoff / dead-letter queue.
- DST/edge-time precision beyond TZ-aware weekend + slot checks.
