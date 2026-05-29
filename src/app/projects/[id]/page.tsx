import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";

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
  const project = await getProject(Number(id));
  if (!project) notFound();

  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ All projects</Link>
      <h1 className="gradient-title">{project.name}</h1>
      {project.goal && <p className="subtitle">{project.goal}</p>}
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

      <button className="btn-gradient" disabled style={{ marginTop: 24 }}>
        Generate learning plan →
      </button>
    </div>
  );
}
