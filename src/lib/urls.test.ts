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
