"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { generatePlanAction } from "./research-actions";

const STEPS = [
  "Reading your materials…",
  "Researching the topic…",
  "Pulling out the core concepts…",
  "Sequencing them easiest-first…",
  "Drafting your plan…",
];

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function GeneratePlanButton({
  projectId,
  label = "Generate learning plan →",
}: {
  projectId: number;
  label?: string;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      await generatePlanAction(projectId);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setRunning(false);
      setError("Couldn't build a plan — please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-gradient"
        style={{ marginTop: 24 }}
        onClick={run}
        disabled={running}
      >
        {label}
      </button>
      {error && <p className="error">{error}</p>}
      {running &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="research-scrim" role="status" aria-live="polite">
            <div className="research-card">
              <div className="research-orb" aria-hidden="true" />
              <p className="research-title">Researching…</p>
              <ul className="research-steps">
                {STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
