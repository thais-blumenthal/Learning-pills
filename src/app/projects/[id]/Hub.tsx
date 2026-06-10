"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { HubNode } from "@/lib/hub-nodes";
import { PathView, CardsView, GridView } from "./hub-views";

const CADENCE_LABEL: Record<string, string> = {
  morning: "Each morning",
  twice: "Twice a day",
  weekdays: "Weekdays only",
};

type ViewKey = "path" | "cards" | "grid";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "path", label: "Path" },
  { key: "cards", label: "Cards" },
  { key: "grid", label: "Grid" },
];

function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 64;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? done / total : 0;
  // Animate from empty to pct on mount.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  const offset = circumference * (1 - shown);
  return (
    <svg className="progress-ring" width={size} height={size}>
      <circle
        className="progress-ring__track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
      />
      <circle
        className="progress-ring__value"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export interface HubProps {
  projectId: number;
  name: string;
  emoji: string | null;
  blurb: string | null;
  cadence: string;
  nodes: HubNode[];
  done: number;
  total: number;
  streak: number;
  /** Edit-plan / Regenerate-plan actions, rendered into the controls row. */
  planActions: ReactNode;
}

export function Hub({
  projectId,
  name,
  emoji,
  blurb,
  cadence,
  nodes,
  done,
  total,
  streak,
  planActions,
}: HubProps) {
  const [view, setView] = useState<ViewKey>("path");
  const finished = total > 0 && done === total;

  return (
    <div className="hub">
      <div className="hub-header">
        <h1 className="gradient-title">
          {emoji ? `${emoji} ` : ""}
          {name}
        </h1>
        {blurb && <p className="hub-blurb">{blurb}</p>}
      </div>

      <div className="hub-stats">
        <div className="stat-card">
          <ProgressRing done={done} total={total} />
          <div>
            <p className="stat-label">Progress</p>
            <p className="stat-sub">
              {done}/{total} pills done
            </p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-flame">🔥</span>
          <div>
            <p className="stat-label">{streak} day streak</p>
            <p className="stat-sub">keep it warm</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-send" aria-hidden>
            ➤
          </span>
          <div>
            <p className="stat-label">Slack · {CADENCE_LABEL[cadence] ?? cadence}</p>
            <p className="stat-sub">next pill drips automatically</p>
          </div>
        </div>
      </div>

      {finished && (
        <div className="finish-banner">🎉 You finished {name}!</div>
      )}

      <div className="hub-controls">
        <div className="view-switch" role="group" aria-label="Choose a view">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="hub-plan-actions">{planActions}</div>
      </div>

      {view === "path" && <PathView projectId={projectId} nodes={nodes} />}
      {view === "cards" && <CardsView projectId={projectId} nodes={nodes} />}
      {view === "grid" && <GridView projectId={projectId} nodes={nodes} />}
    </div>
  );
}
