import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";
import { getPlan } from "@/db/plan";
import { GeneratePlanButton } from "./GeneratePlanButton";
import { DeleteProjectButton } from "../DeleteProjectButton";
import { PlanReview } from "./PlanReview";
import { ReferenceMaterials } from "./ReferenceMaterials";
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

      <ReferenceMaterials
        projectId={numericId}
        sources={project.sources.map((s) => ({ id: s.id, url: s.url }))}
      />

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
            {keptConcepts.map((c, i) => (
              <li key={c.id} className="concept-row">
                <span className="concept-num">{i + 1}</span>
                <Link href={`/projects/${numericId}/pills/${c.id}`} className="concept-link">
                  <p className="concept-title">{c.title}</p>
                  <p className="concept-hook">{c.hook}</p>
                </Link>
                <span className="concept-state">
                  {c.completion === "mastered"
                    ? "✓ done"
                    : c.completion === "shaky"
                      ? "🤔 revisit"
                      : `${c.minutes}m`}
                </span>
              </li>
            ))}
          </ol>
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
