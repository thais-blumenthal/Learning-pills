"use server";

import { redirect } from "next/navigation";
import { createProject, type Cadence } from "@/db/projects";

export interface CreateProjectFormInput {
  name: string;
  goal: string;
  urls: string[];
  cadence: string;
}

export async function createProjectAction(input: CreateProjectFormInput) {
  if (!input.name.trim()) {
    throw new Error("Project name is required");
  }
  const project = await createProject({
    name: input.name,
    goal: input.goal,
    urls: input.urls,
    cadence: input.cadence as Cadence,
  });
  redirect(`/projects/${project.id}`);
}
