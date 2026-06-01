"use server";

import { redirect } from "next/navigation";
import { addSource, removeSource } from "@/db/projects";
import { researchProject } from "@/lib/research-project";

export async function addSourceAction(projectId: number, url: string) {
  await addSource(projectId, url);
  await researchProject(projectId); // auto re-research with the new material
  redirect(`/projects/${projectId}`);
}

export async function removeSourceAction(sourceId: number, projectId: number) {
  await removeSource(sourceId, projectId);
  redirect(`/projects/${projectId}`); // no auto-regenerate on remove
}
