import Anthropic from "@anthropic-ai/sdk";
import { parsePill, type Pill } from "./pill-blocks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface GeneratePillInput {
  projectName: string;
  goal: string | null;
  conceptTitle: string;
  conceptHook: string;
}

export async function generatePill(input: GeneratePillInput): Promise<Pill> {
  const prompt = `You write ADHD-friendly micro-lessons. Write ONE bite-sized lesson ("pill") for this concept.

Project: "${input.projectName}"
${input.goal ? `Learner's goal: ${input.goal}` : ""}
Concept: "${input.conceptTitle}"
Hook: ${input.conceptHook}

The lesson body is an ordered sequence of 3-5 typed blocks. Allowed block kinds:
- "read": a short paragraph and/or a few key-point bullets. Shape: {"kind":"read","text":"<1-3 sentences>","points":["<short>","<short>","<short>"]} (text and/or points; keep it tiny).
- "callout": one vivid everyday analogy. Shape: {"kind":"callout","text":"<1-2 sentences>"}.
- "do": ONE multiple-choice comprehension check. Shape: {"kind":"do","question":"<question>","options":["<a>","<b>","<c>"],"answer":<0-2 index of the correct option>}.

Rules: start with a "read" block; optionally one "callout"; end with EXACTLY ONE "do" block (the only do block). Keep every string concise and concrete.${input.goal ? ` Frame the lesson to serve the learner's goal above.` : ""}

Respond with ONLY minified JSON (no prose, no markdown fences), shaped EXACTLY:
{"blocks":[ ... ],"takeaway":"<one punchy closing line>"}`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain a JSON object");
  }
  return parsePill(JSON.parse(cleaned.slice(start, end + 1)));
}
