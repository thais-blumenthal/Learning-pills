import Anthropic from "@anthropic-ai/sdk";
import { parsePlan, type Plan, MAX_CONCEPTS } from "./plan";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface GeneratePlanInput {
  name: string;
  goal: string | null;
  sources: { url: string; text: string }[];
}

export async function generatePlan(input: GeneratePlanInput): Promise<Plan> {
  const materials = input.sources
    .filter((s) => s.text)
    .map((s) => `SOURCE: ${s.url}\n${s.text}`)
    .join("\n\n---\n\n");

  const prompt = `You design ADHD-friendly micro-learning plans.

Topic: "${input.name}"
${input.goal ? `Learner's goal: ${input.goal}` : ""}

Use the provided source material first. If it is thin or missing, use the web_search tool to research the topic, then build the plan. Break the topic into 5-${MAX_CONCEPTS} bite-sized concepts, ordered easiest-first.

${materials ? `SOURCE MATERIAL:\n${materials}` : "No source material was readable — research the topic with web_search before planning."}

When you are done, respond with ONLY minified JSON (no prose, no markdown fences), shaped EXACTLY:
{"emoji":"<one emoji>","blurb":"<one short tagline>","concepts":[{"title":"<3-6 words>","hook":"<one plain sentence>","minutes":<integer 1-5>}]}`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let finalText = "";

  // web_search is a server-side tool; the API may return stop_reason "pause_turn"
  // when its internal loop hits the iteration cap — re-send to continue.
  for (let i = 0; i < 6; i++) {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    });

    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }

    finalText = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    break;
  }

  if (!finalText) {
    throw new Error("Plan generation did not complete (web search loop exhausted)");
  }

  const cleaned = finalText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain a JSON object");
  }
  return parsePlan(JSON.parse(cleaned.slice(start, end + 1)));
}
