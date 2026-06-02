"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pill, Block } from "@/lib/pill-blocks";
import { completePillAction } from "./pill-actions";

const KTAG: Record<string, { label: string; ico: string; cls: string }> = {
  read: { label: "READ", ico: "📖", cls: "kt-read" },
  callout: { label: "PICTURE THIS", ico: "✦", cls: "kt-read" },
  do: { label: "DO", ico: "✓", cls: "kt-do" },
};

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function FocusReader({
  projectId,
  conceptId,
  title,
  minutes,
  index,
  total,
  pill,
  completion,
}: {
  projectId: number;
  conceptId: number;
  title: string;
  minutes: number;
  index: number;
  total: number;
  pill: Pill;
  completion: "mastered" | "shaky" | null;
}) {
  const router = useRouter();
  const doIndex = pill.blocks.findIndex((b) => b.kind === "do");
  const [picked, setPicked] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const doBlock = pill.blocks[doIndex];
  const answeredCorrectly =
    doBlock && doBlock.kind === "do" && picked === doBlock.answer;
  const alreadyDone = completion !== null;

  async function finish(result: "mastered" | "shaky") {
    setSubmitting(true);
    try {
      await completePillAction(conceptId, projectId, result);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setSubmitting(false);
    }
  }

  return (
    <div className="reader">
      <div className="reader-bar">
        <button className="reader-back" onClick={() => router.push(`/projects/${projectId}`)}>
          ‹ Plan
        </button>
        <div className="reader-prog">
          <span className="reader-fill" style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span className="reader-time">◷ {minutes} min</span>
      </div>

      <div className="reader-body">
        <p className="reader-kicker">CONCEPT {index} OF {total}</p>
        <h1 className="gradient-title">{title}</h1>

        {pill.blocks.map((b, i) => (
          <BlockView
            key={i}
            block={b}
            picked={picked}
            setPicked={alreadyDone ? () => {} : setPicked}
          />
        ))}

        <p className="reader-takeaway">{pill.takeaway}</p>

        <div className="reader-footer">
          {alreadyDone ? (
            <button
              className="btn-gradient"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              Back to plan →
            </button>
          ) : (
            <>
              <button
                className="btn-ghost"
                disabled={!answeredCorrectly || submitting}
                onClick={() => finish("shaky")}
              >
                🤔 Kinda — bring it back
              </button>
              <button
                className="btn-gradient"
                disabled={!answeredCorrectly || submitting}
                onClick={() => finish("mastered")}
              >
                Got it ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockView({
  block,
  picked,
  setPicked,
}: {
  block: Block;
  picked: number | null;
  setPicked: (i: number) => void;
}) {
  const tag = KTAG[block.kind];
  return (
    <div className={block.kind === "callout" ? "lblock lblock-callout" : "lblock"}>
      <span className={`ktag ${tag.cls}`}>
        {tag.ico} {tag.label}
      </span>
      {block.kind === "read" && (
        <div>
          {block.text && <p className="lp">{block.text}</p>}
          {block.points && block.points.length > 0 && (
            <ul className="lp-points">
              {block.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {block.kind === "callout" && <p className="lp">{block.text}</p>}
      {block.kind === "do" && (
        <div className="qcheck">
          <p className="qc-q">{block.question}</p>
          <div className="qc-opts">
            {block.options.map((o, i) => {
              let cls = "qc-opt";
              if (picked !== null) {
                if (i === block.answer) cls += " ok";
                else if (i === picked) cls += " no";
              }
              return (
                <button key={i} className={cls} onClick={() => setPicked(i)}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
