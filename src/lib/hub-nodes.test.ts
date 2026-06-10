import { describe, expect, it } from "vitest";
import { deriveNodeStates } from "./hub-nodes";

const concept = (id: number, completion: string | null) => ({
  id,
  position: id,
  title: `Concept ${id}`,
  hook: `Hook ${id}`,
  minutes: 2,
  completion,
});

describe("deriveNodeStates", () => {
  it("returns an empty array for no concepts", () => {
    expect(deriveNodeStates([])).toEqual([]);
  });

  it("marks the first incomplete concept current and the rest locked", () => {
    const nodes = deriveNodeStates([concept(1, null), concept(2, null), concept(3, null)]);
    expect(nodes.map((n) => n.node)).toEqual(["current", "locked", "locked"]);
  });

  it("marks mastered as done and shaky as shaky", () => {
    const nodes = deriveNodeStates([concept(1, "mastered"), concept(2, "shaky")]);
    expect(nodes.map((n) => n.node)).toEqual(["done", "shaky"]);
  });

  it("makes the first null after completed ones current, later nulls locked", () => {
    const nodes = deriveNodeStates([
      concept(1, "mastered"),
      concept(2, "shaky"),
      concept(3, null),
      concept(4, null),
    ]);
    expect(nodes.map((n) => n.node)).toEqual(["done", "shaky", "current", "locked"]);
  });

  it("has no current when everything is complete", () => {
    const nodes = deriveNodeStates([concept(1, "mastered"), concept(2, "mastered")]);
    expect(nodes.some((n) => n.node === "current")).toBe(false);
    expect(nodes.every((n) => n.node === "done")).toBe(true);
  });

  it("carries through id/title/hook/minutes unchanged", () => {
    const [n] = deriveNodeStates([concept(7, null)]);
    expect(n).toMatchObject({ id: 7, title: "Concept 7", hook: "Hook 7", minutes: 2 });
  });
});
