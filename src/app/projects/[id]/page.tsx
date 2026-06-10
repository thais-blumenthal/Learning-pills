import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";
import { getPlan } from "@/db/plan";
import { GeneratePlanButton } from "./GeneratePlanButton";
import { DeleteProjectButton } from "../DeleteProjectButton";
import { PlanReview } from "./PlanReview";
import { ReferenceMaterials } from "./ReferenceMaterials";
import { reopenPlanAction, resetToDraftAction } from "./review-actions";
import { Hub } from "./Hub";
import { deriveNodeStates } from "@/lib/hub-nodes";
import { computeStreak } from "@/lib/streak";

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
  // On learning projects the Hub renders its own header + delivery card,
  // so the page-level title/blurb/goal/cadence would duplicate it.
  const isLearning = project.status === "learning";

  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ All projects</Link>
      {!isLearning && (
        <>
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
        </>
      )}

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
        (() => {
          const nodes = deriveNodeStates(keptConcepts);
          const done = keptConcepts.filter((c) => c.completion != null).length;
          const streak = computeStreak(
            keptConcepts
              .map((c) => c.completedAt)
              .filter((d): d is Date => d != null),
            new Date(),
          );
          return (
            <Hub
              projectId={numericId}
              name={project.name}
              emoji={project.emoji}
              blurb={project.blurb}
              cadence={project.cadence}
              nodes={nodes}
              done={done}
              total={keptConcepts.length}
              streak={streak}
              planActions={
                <>
                  <form action={reopenPlanAction.bind(null, numericId)}>
                    <button type="submit" className="btn-ghost">
                      Edit plan
                    </button>
                  </form>
                  <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
                </>
              }
            />
          );
        })()
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
