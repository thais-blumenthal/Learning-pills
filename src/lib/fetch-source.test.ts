import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSourceText } from "./fetch-source";

afterEach(() => vi.restoreAllMocks());

describe("fetchSourceText", () => {
  it("returns extracted text on a successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<body><p>Hello world</p></body>", { status: 200 })),
    );
    expect(await fetchSourceText("https://x.com")).toBe("Hello world");
  });

  it("returns empty string on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await fetchSourceText("https://x.com")).toBe("");
  });

  it("returns empty string when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    expect(await fetchSourceText("https://x.com")).toBe("");
  });
});
