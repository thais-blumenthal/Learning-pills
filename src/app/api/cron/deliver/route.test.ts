import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ORIGINAL = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
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
