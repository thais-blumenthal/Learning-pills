import Link from "next/link";
import { listProjects } from "@/db/projects";
import { DeleteProjectButton } from "./projects/DeleteProjectButton";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  morning: "Each morning",
  twice: "Twice a day",
  weekdays: "Weekdays only",
};

export default async function HomePage() {
  const projects = await listProjects();

  return (
    <>
      <p className="kicker">LEARNING PILLS</p>
      <h1 className="gradient-title">Your learning projects</h1>
      <p className="subtitle">Bite-sized lessons, delivered to Slack.</p>

      <div className="grid">
        <Link href="/projects/new" className="card new-card">
          <span className="plus-chip">+</span>
          <span className="new-title">New project</span>
          <span className="new-sub">Add a topic + your materials</span>
        </Link>

        {projects.map((project) => (
          <div key={project.id} className="card project-card">
            <Link href={`/projects/${project.id}`} className="card-body">
              <h2 className="project-name">{project.name}</h2>
              {project.goal && <p className="project-goal">{project.goal}</p>}
              <span className="cadence">↗ {CADENCE_LABEL[project.cadence] ?? project.cadence}</span>
            </Link>
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.name}
              variant="icon"
            />
          </div>
        ))}
      </div>
    </>
  );
}
