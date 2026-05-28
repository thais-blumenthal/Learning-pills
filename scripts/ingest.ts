import Anthropic from "@anthropic-ai/sdk";
import { db } from "../src/db/index";
import { modules, chunks } from "../src/db/schema";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const sourceText = process.argv[2];
const sourceTitle = process.argv[3] || "Untitled module";

if (!sourceText) {
  console.error('Usage: npx tsx ... scripts/ingest.ts "your text here" "Title"');
  process.exit(1);
}

const prompt = `Break the following content into 5-8 standalone learning chunks for someone with ADHD who learns in short bursts.

Each chunk must be:
- ONE self-contained idea
- readable in under 90 seconds (max ~90 words)
- followed by one short active-recall question

Return ONLY a JSON array, no preamble, no markdown fences. Format:
[{"title": "...", "body": "...", "question": "..."}]

CONTENT:
${sourceText}`;

const msg = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4000,
  messages: [{ role: "user", content: prompt }],
});

const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
const cleaned = raw.replace(/```json|```/g, "").trim();
const parsed = JSON.parse(cleaned);

const [mod] = await db.insert(modules).values({ title: sourceTitle }).returning();

await db.insert(chunks).values(
  parsed.map((c: any, i: number) => ({
    moduleId: mod.id,
    position: i,
    title: c.title,
    body: c.body,
    question: c.question,
  }))
);

console.log(`✅ Created module "${sourceTitle}" with ${parsed.length} chunks.`);
