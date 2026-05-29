import * as cheerio from "cheerio";

export const MAX_SOURCE_CHARS = 6000;

export function extractReadableText(html: string): string {
  if (!html || !html.trim()) return "";
  const $ = cheerio.load(html);
  $("script, style, nav, noscript, header, footer, svg").remove();
  const text = $("body").length ? $("body").text() : $.root().text();
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_SOURCE_CHARS);
}
