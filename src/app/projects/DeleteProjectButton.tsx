"use client";

import { useState } from "react";
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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${projectName}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteProjectAction(projectId);
    } catch (err) {
      // redirect() throws a NEXT_REDIRECT error — re-throw so navigation happens.
      if (isRedirectError(err)) throw err;
      setDeleting(false);
      window.alert("Something went wrong deleting the project. Please try again.");
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="card-delete"
        aria-label={`Delete ${projectName}`}
        title="Delete project"
        onClick={handleDelete}
        disabled={deleting}
      >
        ✕
      </button>
    );
  }

  return (
    <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
      {deleting ? "Deleting…" : "Delete project"}
    </button>
  );
}
