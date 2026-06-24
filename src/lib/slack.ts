export interface PillMessage {
  channel: string;
  emoji: string | null;
  projectName: string;
  pillTitle: string;
  hook: string;
  minutes: number;
  url: string;
}

type FetchFn = typeof fetch;

export function buildBlocks(msg: PillMessage): any[] {
  const heading = `${msg.emoji ? msg.emoji + " " : ""}*${msg.projectName}*`;
  return [
    { type: "section", text: { type: "mrkdwn", text: heading } },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${msg.pillTitle}*\n${msg.hook}  ·  ~${msg.minutes} min` },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open today's pill →", emoji: true },
          url: msg.url,
          style: "primary",
        },
      ],
    },
  ];
}

export async function sendPill(
  msg: PillMessage,
  token: string,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  const res = await fetchFn("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: msg.channel,
      text: `${msg.projectName}: ${msg.pillTitle}`, // fallback for notifications
      blocks: buildBlocks(msg),
    }),
  });
  // Slack returns HTTP 200 with { ok: false, error } on failures.
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack error: ${data.error ?? res.status}`);
}
