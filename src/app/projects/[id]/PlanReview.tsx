"use client";

import { useState } from "react";
import { approvePlanAction } from "./review-actions";

export interface ReviewConcept {
  id: number;
  position: number;
  title: string;
  hook: string;
  minutes: number;
  included: boolean;
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function PlanReview({
  projectId,
  concepts,
}: {
  projectId: number;
  concepts: ReviewConcept[];
}) {
  const [kept, setKept] = useState<Record<number, boolean>>(
    () => Object.fromEntries(concepts.map((c) => [c.id, c.included])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const keptConcepts = concepts.filter((c) => kept[c.id]);
  const keptCount = keptConcepts.length;
  const totalMinutes = keptConcepts.reduce((sum, c) => sum + c.minutes, 0);

  function toggle(id: number) {
    setKept((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function approve() {
    if (keptCount === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await approvePlanAction(
        projectId,
        concepts.filter((c) => kept[c.id]).map((c) => c.id),
      );
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setSubmitting(false);
      setError("Couldn't approve the plan — please try again.");
    }
  }

  return (
    <>
      <ol className="concept-list">
        {concepts.map((c) => (
          <li
            key={c.id}
            className={kept[c.id] ? "concept-row" : "concept-row concept-dropped"}
          >
            <span className="concept-num">{c.position + 1}</span>
            <div>
              <p className="concept-title">{c.title}</p>
              <p className="concept-hook">{c.hook}</p>
            </div>
            <span className="concept-minutes">{c.minutes}m</span>
            <button
              type="button"
              className={kept[c.id] ? "toggle toggle-on" : "toggle toggle-off"}
              role="switch"
              aria-checked={kept[c.id]}
              aria-label={`${kept[c.id] ? "Drop" : "Keep"} ${c.title}`}
              onClick={() => toggle(c.id)}
            >
              <span className="toggle-knob">{kept[c.id] ? "✓" : "✕"}</span>
            </button>
          </li>
        ))}
      </ol>

      {error && <p className="error">{error}</p>}

      <div className="review-footer">
        <span className="review-summary">
          {keptCount} concept{keptCount === 1 ? "" : "s"} · ~{totalMinutes} min
        </span>
        <button
          type="button"
          className="btn-gradient"
          onClick={approve}
          disabled={keptCount === 0 || submitting}
        >
          {submitting ? "Approving…" : "Approve plan ✓"}
        </button>
      </div>
    </>
  );
}
