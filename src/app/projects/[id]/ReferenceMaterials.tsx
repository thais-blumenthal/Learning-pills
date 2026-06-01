"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { isValidHttpUrl } from "@/lib/urls";
import { addSourceAction, removeSourceAction } from "./source-actions";

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

export interface MaterialSource {
  id: number;
  url: string;
}

export function ReferenceMaterials({
  projectId,
  sources,
}: {
  projectId: number;
  sources: MaterialSource[];
}) {
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [researching, setResearching] = useState(false);

  async function add() {
    const value = urlInput.trim();
    if (!value) return;
    if (!isValidHttpUrl(value)) {
      setError("That doesn't look like a valid URL (must start with http:// or https://).");
      return;
    }
    if (sources.some((s) => s.url === value)) {
      setError("That URL is already in your materials.");
      return;
    }
    setError("");
    setResearching(true);
    try {
      await addSourceAction(projectId, value);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setResearching(false);
      setError("Couldn't add that material — please try again.");
    }
  }

  async function remove(sourceId: number) {
    try {
      await removeSourceAction(sourceId, projectId);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError("Couldn't remove that material — please try again.");
    }
  }

  return (
    <>
      <h3>Reference materials</h3>
      {sources.length > 0 ? (
        <ul className="materials-list">
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.url}
              </a>
              <button
                type="button"
                className="material-remove"
                aria-label={`Remove ${source.url}`}
                onClick={() => remove(source.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No URLs added.</p>
      )}

      <div className="row">
        <input
          className="input"
          placeholder="https://…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-gradient" onClick={add} disabled={researching}>
          Add &amp; re-research
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {researching &&
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
