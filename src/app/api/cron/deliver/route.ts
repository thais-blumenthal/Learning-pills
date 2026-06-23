import { NextResponse } from "next/server";
import { runDelivery } from "@/db/delivery";
import { sendPill } from "@/lib/slack";
import { pillPath, absoluteUrl } from "@/lib/urls";
import type { Slot } from "@/lib/cadence";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slotParam = new URL(request.url).searchParams.get("slot");
  const slot: Slot = slotParam === "afternoon" ? "afternoon" : "morning";

  const token = process.env.SLACK_BOT_TOKEN!;
  const channel = process.env.SLACK_CHANNEL_ID!;
  const baseUrl = process.env.APP_URL!;
  const timeZone = process.env.APP_TZ ?? "UTC";

  const summary = await runDelivery({
    slot,
    now: new Date(),
    timeZone,
    send: async (project, concept) => {
      await sendPill(
        {
          channel,
          emoji: project.emoji,
          projectName: project.name,
          pillTitle: concept.title,
          hook: concept.hook,
          minutes: concept.minutes,
          url: absoluteUrl(baseUrl, pillPath(project.id, concept.id)),
        },
        token,
      );
    },
  });

  return NextResponse.json({ slot, ...summary });
}
