import { describe, expect, it, vi } from "vitest";
import { buildBlocks, sendPill, type PillMessage } from "./slack";

const msg: PillMessage = {
  channel: "C123",
  emoji: "🧠",
  projectName: "Stoicism",
  pillTitle: "Premeditatio Malorum",
  hook: "Rehearse the worst, fear it less.",
  minutes: 3,
  url: "https://app.example.com/projects/1/pills/2",
};

describe("buildBlocks", () => {
  it("includes the title, hook, minutes, and a deep-link button", () => {
    const blocks = buildBlocks(msg);
    const json = JSON.stringify(blocks);
    expect(json).toContain("Premeditatio Malorum");
    expect(json).toContain("Rehearse the worst");
    expect(json).toContain("~3 min");
    const action = blocks.find((b) => b.type === "actions");
    expect(action.elements[0].url).toBe(msg.url);
  });
});

describe("sendPill", () => {
  it("POSTs to chat.postMessage with the bearer token and channel", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    await sendPill(msg, "xoxb-token", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect(init.headers.Authorization).toBe("Bearer xoxb-token");
    const body = JSON.parse(init.body);
    expect(body.channel).toBe("C123");
    expect(Array.isArray(body.blocks)).toBe(true);
  });

  it("throws when Slack responds with ok:false", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ ok: false, error: "channel_not_found" })),
    );
    await expect(sendPill(msg, "xoxb-token", fetchFn)).rejects.toThrow("channel_not_found");
  });
});
