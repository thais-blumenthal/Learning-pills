import { describe, expect, it } from "vitest";
import { parsePlan, MAX_CONCEPTS } from "./plan";

const good = {
  emoji: "🤖",
  blurb: "Build a Hermes agent.",
  concepts: [
    { title: "What is Hermes", hook: "A framework for agents.", minutes: 2 },
    { title: "Core loop", hook: "How the agent thinks.", minutes: "3" },
  ],
};

describe("parsePlan", () => {
  it("accepts a valid plan and coerces minutes to a positive int", () => {
    const plan = parsePlan(good);
    expect(plan.emoji).toBe("🤖");
    expect(plan.concepts).toHaveLength(2);
    expect(plan.concepts[1].minutes).toBe(3);
  });

  it("trims the concept list to MAX_CONCEPTS", () => {
    const many = {
      ...good,
      concepts: Array.from({ length: MAX_CONCEPTS + 3 }, (_, i) => ({
        title: `C${i}`,
        hook: "h",
        minutes: 2,
      })),
    };
    expect(parsePlan(many).concepts).toHaveLength(MAX_CONCEPTS);
  });

  it("rejects missing/empty concepts", () => {
    expect(() => parsePlan({ emoji: "x", blurb: "y", concepts: [] })).toThrow(/concept/i);
    expect(() => parsePlan({ emoji: "x", blurb: "y" })).toThrow(/concept/i);
  });

  it("rejects a concept missing title or hook", () => {
    expect(() =>
      parsePlan({ emoji: "x", blurb: "y", concepts: [{ hook: "h", minutes: 2 }] }),
    ).toThrow(/title/i);
  });
});
