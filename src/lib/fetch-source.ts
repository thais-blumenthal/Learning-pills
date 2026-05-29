import { extractReadableText } from "./extract-text";

const FETCH_TIMEOUT_MS = 10_000;

export async function fetchSourceText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "LearningPillsBot/1.0 (+local)" },
    });
    if (!res.ok) return "";
    return extractReadableText(await res.text());
  } catch {
    return "";
  }
}
