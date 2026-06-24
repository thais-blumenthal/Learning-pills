import { describe, expect, it } from "vitest";
import { isValidHttpUrl, normalizeUrls, pillPath, absoluteUrl } from "./urls";

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
