import { describe, expect, it } from "vitest";
import { extractReadableText, MAX_SOURCE_CHARS } from "./extract-text";

describe("extractReadableText", () => {
  it("strips script/style/nav and returns readable text", () => {
    const html = `
      <html><head><style>.a{color:red}</style></head>
      <body><nav>Home About</nav><script>alert(1)</script>
      <p>Hermes is an agent framework.</p></body></html>`;
    const out = extractReadableText(html);
    expect(out).toContain("Hermes is an agent framework.");
    expect(out).not.toContain("alert(1)");
    expect(out).not.toContain("color:red");
  });

  it("collapses whitespace and trims", () => {
    expect(extractReadableText("<body><p>a   b\n\n c</p></body>")).toBe("a b c");
  });

  it("truncates to MAX_SOURCE_CHARS", () => {
    const long = "<body><p>" + "x".repeat(MAX_SOURCE_CHARS + 500) + "</p></body>";
    expect(extractReadableText(long).length).toBe(MAX_SOURCE_CHARS);
  });

  it("returns empty string for empty/garbage input", () => {
    expect(extractReadableText("")).toBe("");
    expect(extractReadableText("   ")).toBe("");
  });
});
