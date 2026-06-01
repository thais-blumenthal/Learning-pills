"use server";

import { redirect } from "next/navigation";
import { researchProject } from "@/lib/research-project";

export async function generatePlanAction(projectId: number) {
  await researchProject(projectId);
  redirect(`/projects/${projectId}`);
}
