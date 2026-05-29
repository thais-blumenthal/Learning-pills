"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { deleteProjectAction } from "./actions";

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function DeleteProjectButton({
  projectId,
  projectName,
  variant = "button",
}: {
  projectId: number;
  projectName: string;
  variant?: "button" | "icon";
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  function close() {
    if (deleting) return;
    setConfirming(false);
    setFailed(false);
  }

  async function confirmDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await deleteProjectAction(projectId);
    } catch (err) {
      // redirect() throws a NEXT_REDIRECT error — re-throw so navigation happens.
      if (isRedirectError(err)) throw err;
      setDeleting(false);
      setFailed(true);
    }
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        className="card-delete"
        aria-label={`Delete ${projectName}`}
        title="Delete project"
        onClick={() => setConfirming(true)}
      >
        ✕
      </button>
    ) : (
      <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
        Delete project
      </button>
    );

  // Rendered via a portal to document.body so the fixed overlay isn't trapped by
  // a transformed ancestor (e.g. .project-card:hover applies a transform).
  const modal = (
    <div
      className="modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={close}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="delete-modal-title" className="modal-title">
          Delete this project?
        </h2>
        <p className="modal-text">
          “{projectName}” and its materials will be permanently removed. This can’t be undone.
        </p>
        {failed && <p className="error">Something went wrong. Please try again.</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={close} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger-solid"
            onClick={confirmDelete}
            disabled={deleting}
            autoFocus
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {confirming && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
