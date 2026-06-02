import { describe, expect, it } from "vitest";
import { parsePill } from "./pill-blocks";

const good = {
  blocks: [
    { kind: "read", text: "Agents loop.", points: ["think", "act", "observe"] },
    { kind: "callout", text: "Picture a thermostat." },
    {
      kind: "do",
      question: "What comes after Act?",
      options: ["Stop", "Observe", "Restart"],
      answer: 1,
    },
  ],
  takeaway: "Agents think, act, observe — then repeat.",
};

describe("parsePill", () => {
  it("accepts a valid pill", () => {
    const pill = parsePill(good);
    expect(pill.blocks).toHaveLength(3);
    expect(pill.takeaway).toBe("Agents think, act, observe — then repeat.");
    const doBlock = pill.blocks.find((b) => b.kind === "do");
    expect(doBlock).toBeTruthy();
  });

  it("rejects a read block with neither text nor points", () => {
    expect(() =>
      parsePill({ blocks: [{ kind: "read" }, good.blocks[2]], takeaway: "t" }),
    ).toThrow(/read/i);
  });

  it("throws when there is no do block", () => {
    expect(() =>
      parsePill({ blocks: [{ kind: "read", text: "x" }], takeaway: "t" }),
    ).toThrow(/do/i);
  });

  it("keeps only the first do block when several are present", () => {
    const pill = parsePill({
      blocks: [good.blocks[2], good.blocks[2]],
      takeaway: "t",
    });
    expect(pill.blocks.filter((b) => b.kind === "do")).toHaveLength(1);
  });

  it("coerces an out-of-range answer into 0-2", () => {
    const pill = parsePill({
      blocks: [{ kind: "do", question: "q", options: ["a", "b", "c"], answer: 9 }],
      takeaway: "t",
    });
    const doBlock = pill.blocks.find((b) => b.kind === "do")!;
    expect(doBlock.kind === "do" && doBlock.answer >= 0 && doBlock.answer <= 2).toBe(true);
  });

  it("rejects a do block without exactly 3 options", () => {
    expect(() =>
      parsePill({
        blocks: [{ kind: "do", question: "q", options: ["a", "b"], answer: 0 }],
        takeaway: "t",
      }),
    ).toThrow(/option/i);
  });

  it("defaults a missing takeaway", () => {
    const pill = parsePill({ blocks: [good.blocks[2]] });
    expect(typeof pill.takeaway).toBe("string");
    expect(pill.takeaway.length).toBeGreaterThan(0);
  });

  it("throws on non-object input", () => {
    expect(() => parsePill(null)).toThrow();
  });
});
