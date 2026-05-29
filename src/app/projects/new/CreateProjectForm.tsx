"use client";

import { useState } from "react";
import { isValidHttpUrl } from "@/lib/urls";
import { createProjectAction } from "./actions";

const CADENCES = [
  { value: "morning", label: "Each morning" },
  { value: "twice", label: "Twice a day" },
  { value: "weekdays", label: "Weekdays only" },
] as const;

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [cadence, setCadence] = useState<string>("morning");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addUrl() {
    const value = urlInput.trim();
    if (!value) return;
    if (!isValidHttpUrl(value)) {
      setError("That doesn't look like a valid URL (must start with http:// or https://).");
      return;
    }
    if (!urls.includes(value)) setUrls([...urls, value]);
    setUrlInput("");
    setError("");
  }

  function removeUrl(target: string) {
    setUrls(urls.filter((u) => u !== target));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await createProjectAction({ name, goal, urls, cadence });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Project name</span>
        <input
          className="input input-lg"
          placeholder="e.g. Hermes agent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">What do you want to get out of this?</span>
        <textarea
          className="textarea"
          placeholder="e.g. Build a working Hermes agent and understand its core abstractions."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">Reference materials (paste a URL)</span>
        <div className="row">
          <input
            className="input"
            placeholder="https://…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <button type="button" className="btn-gradient" onClick={addUrl}>
            Add
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {urls.length > 0 && (
          <div className="chips">
            {urls.map((url) => (
              <span key={url} className="chip">
                🔗 {url}
                <button type="button" aria-label={`Remove ${url}`} onClick={() => removeUrl(url)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">Delivery cadence</span>
        <div className="segmented">
          {CADENCES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={cadence === c.value}
              onClick={() => setCadence(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-gradient btn-block" disabled={!name.trim() || submitting}>
        {submitting ? "Saving…" : "Research & build my plan →"}
      </button>
    </form>
  );
}
