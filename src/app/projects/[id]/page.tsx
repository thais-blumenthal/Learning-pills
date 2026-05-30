import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";
import { getPlan } from "@/db/plan";
import { GeneratePlanButton } from "./GeneratePlanButton";
import { DeleteProjectButton } from "../DeleteProjectButton";
import { PlanReview } from "./PlanReview";
import { reopenPlanAction, resetToDraftAction } from "./review-actions";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  morning: "Each morning",
  twice: "Twice a day",
  weekdays: "Weekdays only",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const project = await getProject(numericId);
  if (!project) notFound();

  const hasPlan = project.status === "review" || project.status === "learning";
  const concepts = hasPlan ? await getPlan(numericId) : [];
  const keptConcepts = concepts.filter((c) => c.included);

  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ All projects</Link>
      <h1 className="gradient-title">
        {project.emoji ? `${project.emoji} ` : ""}
        {project.name}
      </h1>
      {project.blurb && <p className="subtitle">{project.blurb}</p>}
      {project.goal && (
        <p className="goal-note">
          <strong>Your goal:</strong> {project.goal}
        </p>
      )}
      <p className="cadence">↗ {CADENCE_LABEL[project.cadence] ?? project.cadence}</p>

      <h3>Reference materials</h3>
      {project.sources.length > 0 ? (
        <ul className="materials-list">
          {project.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.url}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No URLs added.</p>
      )}

      {project.status === "review" ? (
        <>
          <h3>Review your plan</h3>
          <p className="subtitle">Keep what you want to learn, drop the rest.</p>
          <PlanReview projectId={numericId} concepts={concepts} />
          <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
        </>
      ) : project.status === "learning" ? (
        <>
          <h3>Learning plan</h3>
          <ol className="concept-list">
            {keptConcepts.map((c) => (
              <li key={c.id} className="concept-row">
                <span className="concept-num">{c.position + 1}</span>
                <div>
                  <p className="concept-title">{c.title}</p>
                  <p className="concept-hook">{c.hook}</p>
                </div>
                <span className="concept-minutes">{c.minutes}m</span>
              </li>
            ))}
          </ol>
          <p className="subtitle">✨ Pills coming soon — this is where your lessons will live.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <form action={reopenPlanAction.bind(null, numericId)}>
              <button type="submit" className="btn-ghost">Edit plan</button>
            </form>
            <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
          </div>
        </>
      ) : project.status === "researching" ? (
        <>
          <p className="subtitle">Researching… refresh in a moment.</p>
          <form action={resetToDraftAction.bind(null, numericId)}>
            <button type="submit" className="btn-ghost">Start over</button>
          </form>
        </>
      ) : (
        <GeneratePlanButton projectId={numericId} />
      )}

      <div className="detail-danger">
        <DeleteProjectButton projectId={project.id} projectName={project.name} />
      </div>
    </div>
  );
}
