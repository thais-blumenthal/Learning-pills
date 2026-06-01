"use server";

import { redirect } from "next/navigation";
import { addSource, removeSource } from "@/db/projects";
import { researchProject } from "@/lib/research-project";

export async function addSourceAction(projectId: number, url: string) {
  const { inserted } = await addSource(projectId, url);
  if (inserted) {
    await researchProject(projectId); // only re-research when the URL is genuinely new
  }
  redirect(`/projects/${projectId}`);
}

export async function removeSourceAction(sourceId: number, projectId: number) {
  await removeSource(sourceId, projectId);
  redirect(`/projects/${projectId}`); // no auto-regenerate on remove
}
