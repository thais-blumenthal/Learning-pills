import Link from "next/link";
import { CreateProjectForm } from "./CreateProjectForm";

export default function NewProjectPage() {
  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ Projects</Link>
      <h1 className="gradient-title">Start a new project</h1>
      <p className="subtitle">Name it, say what you want from it, and drop in some links.</p>
      <CreateProjectForm />
    </div>
  );
}
