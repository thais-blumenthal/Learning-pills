import Link from "next/link";
import type { HubNode, NodeState } from "@/lib/hub-nodes";

const BADGE_LABEL: Record<NodeState, string> = {
  done: "✓ Completed",
  shaky: "🤔 Revisit",
  current: "Start now",
  locked: "🔒 Locked",
};

function isOpenable(state: NodeState): boolean {
  return state !== "locked";
}

function readerHref(projectId: number, conceptId: number): string {
  return `/projects/${projectId}/pills/${conceptId}`;
}

interface ViewProps {
  projectId: number;
  nodes: HubNode[];
}

export function PathView({ projectId, nodes }: ViewProps) {
  return (
    <div className="path-view">
      {nodes.map((n, i) => {
        const open = isOpenable(n.node);
        const dotClass =
          n.node === "locked"
            ? "is-locked"
            : n.node === "current"
              ? "is-current"
              : "is-done";
        const dot = (
          <span className={`node-dot ${dotClass}`} aria-hidden>
            {n.node === "done" || n.node === "shaky" ? "✓" : n.node === "locked" ? "🔒" : i + 1}
          </span>
        );
        const inner = (
          <>
            <p className="path-card-title">{n.title}</p>
            <p className="path-card-hook">{n.hook}</p>
            {n.node === "current" && <span className="path-cta">Start now →</span>}
            {n.node === "shaky" && <span className="path-cta">🤔 Marked to revisit</span>}
            {n.node === "locked" && <span className="status-badge is-locked">🔒 Locked</span>}
          </>
        );
        return (
          <div key={n.id} className={`path-row ${i % 2 === 1 ? "is-right" : ""}`}>
            {dot}
            {open ? (
              <Link href={readerHref(projectId, n.id)} className="path-card">
                {inner}
              </Link>
            ) : (
              <div className="path-card is-locked">{inner}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CardsView({ projectId, nodes }: ViewProps) {
  return (
    <div className="cards-deck">
      {nodes.map((n, i) => {
        const open = isOpenable(n.node);
        const inner = (
          <>
            <span className="deck-index">Pill {i + 1}</span>
            <span className={`status-badge is-${n.node}`}>{BADGE_LABEL[n.node]}</span>
            <p className="deck-title">{n.title}</p>
            <p className="deck-hook">{n.hook}</p>
            <div className="deck-foot">
              <span>{n.minutes}m</span>
              {open ? <span className="deck-cta">Open →</span> : <span>🔒</span>}
            </div>
          </>
        );
        return open ? (
          <Link key={n.id} href={readerHref(projectId, n.id)} className="deck-card">
            {inner}
          </Link>
        ) : (
          <div key={n.id} className="deck-card is-locked">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function GridView({ projectId, nodes }: ViewProps) {
  return (
    <div className="tile-grid">
      {nodes.map((n) => {
        const open = isOpenable(n.node);
        const inner = (
          <>
            <span className={`status-badge is-${n.node}`}>{BADGE_LABEL[n.node]}</span>
            <p className="tile-title">{n.title}</p>
            <span className="tile-min">{n.minutes}m</span>
          </>
        );
        return open ? (
          <Link key={n.id} href={readerHref(projectId, n.id)} className="tile">
            {inner}
          </Link>
        ) : (
          <div key={n.id} className="tile is-locked">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
